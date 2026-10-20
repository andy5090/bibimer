#!/usr/bin/env python3
"""Unauthenticated TLS diagnostics in the isolated lab guest only.

Fixed public URLs; discard all HTTP bodies. Codex uses a nonexistent issuer
path so no device code is requested from the actual authorization endpoint.
Never run against the user's app rootfs or read any authentication material.
"""
import datetime
import json
import os
from pathlib import Path
import signal
import re
import socket
import ssl
import subprocess
import time

HOST = 'auth.openai.com'
URL = 'https://auth.openai.com/'
ISSUER = 'https://auth.openai.com/.well-known/bibimer-public-tls-probe'
BASE = Path('/root/bibimer-probe/auth-network')
CA = '/etc/ssl/certs/ca-certificates.crt'


def record(stage, **value):
    print('AUTH_NETWORK', json.dumps({'stage': stage, **value}, sort_keys=True), flush=True)


def run(command, env=None, timeout=40):
    process = subprocess.Popen(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               start_new_session=True, close_fds=True)
    try:
        return process.communicate(timeout=timeout), process.returncode
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate(timeout=5)
        return (b'', b''), 'timeout'
    finally:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=5)


def main():
    if not Path('/etc/alpine-release').is_file() or os.uname().machine != 'aarch64':
        raise SystemExit('Execute only in the isolated ARM64 Alpine lab guest')
    BASE.mkdir(parents=True, exist_ok=True)
    record('clock', utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
    record('ca', bundleExists=Path(CA).is_file(),
           certFileExists=Path('/etc/ssl/cert.pem').is_file(),
           sslCertFileSet=bool(os.environ.get('SSL_CERT_FILE')),
           sslCertDirSet=bool(os.environ.get('SSL_CERT_DIR')),
           codexCaSet=bool(os.environ.get('CODEX_CA_CERTIFICATE')),
           proxySet=any(os.environ.get(key) for key in ('HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy')))
    try:
        addresses = socket.getaddrinfo(HOST, 443, type=socket.SOCK_STREAM)
        record('dns', ipv4=sum(item[0] == socket.AF_INET for item in addresses),
               ipv6=sum(item[0] == socket.AF_INET6 for item in addresses))
    except OSError as error:
        addresses = []
        record('dns', errorType=type(error).__name__, errno=error.errno)
    seen = set()
    for family, kind, protocol, _, address in addresses:
        if family in seen:
            continue
        seen.add(family)
        for mode in ('default', 'explicit-ca'):
            started = time.monotonic()
            try:
                context = ssl.create_default_context(cafile=CA if mode == 'explicit-ca' else None)
                with socket.socket(family, kind, protocol) as connection:
                    connection.settimeout(10)
                    connection.connect(address)
                    with context.wrap_socket(connection, server_hostname=HOST) as tls:
                        record('python-tls', family=family, mode=mode, verified=True,
                               protocol=tls.version(), seconds=round(time.monotonic()-started,3))
            except (OSError, ssl.SSLError) as error:
                record('python-tls', family=family, mode=mode, verified=False,
                       errorType=type(error).__name__, errno=error.errno,
                       verifyCode=getattr(error,'verify_code',None), seconds=round(time.monotonic()-started,3))
    for family in ('-4','-6'):
        (out, _), code = run(['curl', family, '--head','--silent','--output','/dev/null',
            '--max-time','18','--connect-timeout','8','--write-out','%{http_code} %{ssl_verify_result}',URL], timeout=23)
        fields = out.decode(errors='replace').strip().split()
        record('curl',family=family,exitCode=code,httpStatus=fields[0] if fields and fields[0].isdigit() else None,
               verifyResult=fields[1] if len(fields)==2 and fields[1].isdigit() else None)
    # CLI login clears prior credentials. The lab must have none; do not read
    # the file or ever apply this diagnostic to the user's current app.
    if (Path.home()/'.codex/auth.json').exists():
        raise RuntimeError('Lab auth state exists; refusing the Codex login diagnostic')
    cli = Path('/root/bibimer-probe/codex/node_modules/.bin/codex')
    if not cli.is_file():
        raise RuntimeError('The pinned Codex CLI must already be installed in this isolated lab')
    native_results = {}
    for mode in ('default','explicit-ca','ipv4-host','cert-dir','native-debug'):
        hosts_path = Path('/etc/hosts')
        hosts_before = hosts_path.read_bytes() if hosts_path.exists() else b''
        if mode == 'ipv4-host':
            ipv4 = next((item[4][0] for item in addresses if item[0] == socket.AF_INET), None)
            if not ipv4:
                continue
            hosts_path.write_bytes(hosts_before + ('\n' + ipv4 + ' ' + HOST + '\n').encode())
        env = {**os.environ, 'RUST_LOG':'off', 'RUST_BACKTRACE':'1'}
        if mode == 'explicit-ca':
            env['SSL_CERT_FILE'] = CA
        if mode == 'cert-dir':
            env['SSL_CERT_DIR'] = '/etc/ssl/certs'
        if mode == 'native-debug':
            env['RUST_LOG'] = 'native_tls=debug,hyper_util::client::legacy::client=trace'
        logs = BASE/'codex-logs'
        if logs.exists():
            for item in logs.iterdir():
                if item.is_file(): item.unlink()
        started = time.monotonic()
        try:
            (out, err), code = run([str(cli), '-c', 'cli_auth_credentials_store="file"',
            '-c', 'log_dir="/root/bibimer-probe/auth-network/codex-logs"',
                'login','--device-auth','--experimental_issuer',ISSUER],env=env,timeout=25)
        finally:
            if mode == 'ipv4-host':
                hosts_path.write_bytes(hosts_before)
        markers = [('ca-file-load',b'load_verify_locations cert file error'),('ca-dir-load',b'load_verify_locations cert dir error'),('verify-failed',b'certificate verify failed'),('unknown-issuer',b'unable to get local issuer certificate'),('bad-signature',b'bad signature'),('decrypt-failed',b'decryption failed'),('unsupported',b'unsupported'),('protocol',b'protocol'),('reset',b'connection reset'),('unexpected-eof',b'unexpected eof'),('network-unreachable',b'network is unreachable'),('bad-fd',b'bad file descriptor'),('ssl-error-stack',b'error:0a')]
        debug_categories = set()
        log_bytes, log_files = 0, 0
        if logs.exists():
            for item in logs.iterdir():
                if not item.is_file(): continue
                raw = item.read_bytes()
                log_bytes += len(raw)
                log_files += 1
                debug_categories.update(label for label, marker in markers if marker in raw.lower())
                item.unlink()
        record('native-log-classification',mode=mode,categories=sorted(debug_categories),logFiles=log_files,logBytes=log_bytes)
        # Print only fixed classifications. Never persist/replay raw CLI output.
        record('codex-tls', mode=mode, exitCode=code,
               httpResponseReceived=b'device code request failed with status ' in err,
               transportSendFailed=b'error sending request for url' in err,
               certificateError=b'certificate' in err.lower(),
               panicLocations=['/'.join(item.split('/')[-4:]) for item in re.findall(r'([a-zA-Z0-9_./-]+\.rs:[0-9]+:[0-9]+)',err.decode(errors='replace'))],
               panicFrames=[item.strip() for item in re.findall(r'(?m)^\s*[0-9]+:\s+([a-zA-Z0-9_:<>]+)',err.decode(errors='replace'))][:18],
               requiredSignatureAssert=b'installed rustls crypto provider must support' in err,
               panicKinds=[label for label, marker in [('crypto-provider', b'CryptoProvider'),('no-root-certificates',b'root certificates'),('invalid-certificate',b'InvalidCertificate'),('assertion',b'assertion'),('unimplemented',b'not implemented'),('allocation',b'allocation'),('overflow',b'overflow'),('getrandom',b'getrandom'),('unsupported',b'unsupported'),('SIGILL',b'illegal instruction')] if marker.lower() in err.lower()],
               panicked=b'panicked at' in err,
               nativeAuthPromptSeen=b'one-time code' in out,
               seconds=round(time.monotonic()-started,3))
        native_results[mode] = (code == 1 and b'device code request failed with status ' in err
                                and b'error sending request for url' not in err and b'panicked at' not in err)
        if b'one-time code' in out:
            raise RuntimeError('Unexpected auth prompt from the fixed nonexistent public issuer path')
    if len(native_results) != 5 or not all(native_results.values()):
        raise RuntimeError('Original Codex TLS did not reach the fixed public HTTP endpoint in every profile')
    record('diagnostics-complete', bodiesStored=False, userAppAccessed=False, authorizationCompleted=False)


if __name__ == '__main__':
    main()
