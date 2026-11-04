package app.bibimer;

import android.app.Activity;
import android.app.Dialog;
import android.content.DialogInterface;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** App-owned native dialog; credentials stay outside the WebView. Colors match app.css. */
final class BibimerDialog extends Dialog {
    static final int BUTTON_POSITIVE = DialogInterface.BUTTON_POSITIVE;
    private final Activity activity;
    private final TextView error;
    private final Button positive;
    private final EditText input;

    private BibimerDialog(Builder builder) {
        super(builder.activity);
        activity = builder.activity;
        input = builder.input;
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setTitle(builder.title); // Accessible window title without platform dialog chrome.
        LinearLayout body = new LinearLayout(activity);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(18), dp(18), dp(18), dp(18));
        body.setLayoutDirection(View.LAYOUT_DIRECTION_LOCALE);
        body.setBackground(surface(0xff191e22, 0xff414e56, 14));
        TextView heading = text(builder.title, 0xffe6edf0, 16);
        heading.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        if (android.os.Build.VERSION.SDK_INT >= 28) heading.setAccessibilityHeading(true);
        body.addView(heading, row());
        if (!builder.message.isEmpty()) {
            TextView message = text(builder.message, 0xff8e9da7, 13);
            message.setLineSpacing(dp(3), 1);
            body.addView(message, spaced(10));
        }
        if (input != null) {
            input.setTextColor(0xffe6edf0);
            input.setTextSize(14);
            input.setPadding(dp(10), dp(8), dp(10), dp(8));
            input.setMinHeight(dp(44));
            StateListDrawable field = new StateListDrawable();
            field.addState(new int[]{android.R.attr.state_focused}, surface(0xff14191d, 0xff8bdbbd, 8));
            field.addState(new int[]{}, surface(0xff14191d, 0xff3a454e, 8));
            input.setBackground(field);
            input.setContentDescription(builder.title);
            body.addView(input, spaced(12));
            // Do not let a parent hierarchy save credentials, even temporarily.
            body.setSaveFromParentEnabled(false);
        }
        error = text("", 0xfff29393, 12);
        error.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        error.setVisibility(View.GONE);
        body.addView(error, spaced(8));
        LinearLayout actions = new LinearLayout(activity);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        if (builder.negative != null) {
            Button cancel = button(builder.negative, false);
            actions.addView(cancel, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            cancel.setOnClickListener(v -> {
                // Dismiss first: an action can synchronously open the next dialog.
                dismiss();
                if (builder.onNegative != null) builder.onNegative.onClick(this, DialogInterface.BUTTON_NEGATIVE);
            });
        }
        positive = builder.positive == null ? null : button(builder.positive, true);
        if (positive != null) {
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
            if (builder.negative != null) params.setMarginStart(dp(8));
            actions.addView(positive, params);
            positive.setOnClickListener(v -> {
                dismiss();
                if (builder.onPositive != null) builder.onPositive.onClick(this, BUTTON_POSITIVE);
            });
        }
        body.addView(actions, spaced(14));
        ScrollView scroll = new ScrollView(activity);
        scroll.setSaveEnabled(false);
        scroll.addView(body);
        setContentView(scroll);
        Window window = getWindow();
        window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
        window.setDimAmount(.67f);
        window.setGravity(Gravity.CENTER);
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
            (input == null ? WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN : WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE));
        if (input != null) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    @Override public void show() {
        super.show();
        getWindow().setLayout(Math.min(dp(360), activity.getResources().getDisplayMetrics().widthPixels - dp(24)), ViewGroup.LayoutParams.WRAP_CONTENT);
        if (input != null) input.requestFocus();
    }

    @Override public void dismiss() {
        if (input != null) input.setText("");
        super.dismiss();
    }

    Button getButton(int which) { return which == BUTTON_POSITIVE ? positive : null; }
    void showError(String message) {
        error.setText(message);
        error.setVisibility(View.VISIBLE);
        if (input != null) input.requestFocus();
    }

    private int dp(int value) { return Math.round(value * activity.getResources().getDisplayMetrics().density); }
    private LinearLayout.LayoutParams row() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }
    private LinearLayout.LayoutParams spaced(int gap) {
        LinearLayout.LayoutParams params = row(); params.topMargin = dp(gap); return params;
    }
    private GradientDrawable surface(int fill, int border, int radius) {
        GradientDrawable background = new GradientDrawable();
        background.setColor(fill); background.setCornerRadius(dp(radius)); background.setStroke(dp(1), border);
        return background;
    }
    private TextView text(String value, int color, int size) {
        TextView view = new TextView(activity);
        view.setText(value); view.setTextColor(color); view.setTextSize(size);
        return view;
    }
    private Button button(String label, boolean primary) {
        Button button = new Button(activity);
        button.setText(label); button.setTextSize(14); button.setAllCaps(false);
        button.setSingleLine(false); button.setMinWidth(0); button.setMinimumWidth(0);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setTextColor(primary ? 0xff10261e : 0xffe6edf0);
        button.setMinHeight(dp(44)); button.setMinimumHeight(dp(44));
        button.setPadding(dp(12), dp(8), dp(12), dp(8));
        StateListDrawable background = new StateListDrawable();
        background.addState(new int[]{android.R.attr.state_pressed}, surface(primary ? 0xff75bba1 : 0xff303e46, 0xff8bdbbd, 8));
        background.addState(new int[]{android.R.attr.state_focused}, surface(primary ? 0xff8bdbbd : 0xff22292e, 0xff8bdbbd, 8));
        background.addState(new int[]{}, surface(primary ? 0xff8bdbbd : 0xff22292e, primary ? 0xff8bdbbd : 0xff2b343b, 8));
        button.setBackground(background);
        return button;
    }

    static final class Builder {
        private final Activity activity;
        private String title = "", message = "", positive, negative;
        private EditText input;
        private DialogInterface.OnClickListener onPositive, onNegative;
        Builder(Activity activity) { this.activity = activity; }
        Builder setTitle(String value) { title = value; return this; }
        Builder setMessage(String value) { message = value; return this; }
        Builder setView(EditText value) { input = value; return this; }
        Builder setPositiveButton(String value, DialogInterface.OnClickListener listener) { positive = value; onPositive = listener; return this; }
        Builder setNegativeButton(String value, DialogInterface.OnClickListener listener) { negative = value; onNegative = listener; return this; }
        BibimerDialog create() { return new BibimerDialog(this); }
    }
}
