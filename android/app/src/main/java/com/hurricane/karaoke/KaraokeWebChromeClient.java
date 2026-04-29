package com.hurricane.karaoke;

import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Capacitor's BridgeWebChromeClient calls {@code callback.onCustomViewHidden()} inside
 * {@link WebChromeClient#onShowCustomView}, which tears down YouTube's fullscreen/video
 * surface and often yields a black picture on Fire TV / Android TV WebViews.
 */
public class KaraokeWebChromeClient extends BridgeWebChromeClient {

  private View customView;
  private WebChromeClient.CustomViewCallback customViewCallback;
  private final Bridge bridge;

  public KaraokeWebChromeClient(Bridge bridge) {
    super(bridge);
    this.bridge = bridge;
  }

  @Override
  public void onShowCustomView(View view, CustomViewCallback callback) {
    if (customView != null) {
      onHideCustomView();
      return;
    }
    customView = view;
    customViewCallback = callback;
    ViewGroup decor = (ViewGroup) bridge.getActivity().getWindow().getDecorView();
    decor.addView(
        customView,
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    bridge.getWebView().setVisibility(View.GONE);
  }

  @Override
  public void onHideCustomView() {
    if (customView == null) {
      return;
    }
    ViewGroup decor = (ViewGroup) bridge.getActivity().getWindow().getDecorView();
    decor.removeView(customView);
    customView = null;
    if (customViewCallback != null) {
      customViewCallback.onCustomViewHidden();
      customViewCallback = null;
    }
    bridge.getWebView().setVisibility(View.VISIBLE);
  }
}
