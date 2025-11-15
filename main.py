import webview


if __name__ == '__main__':
    window = webview.create_window('HelloWorld Launcher', 'ui/index.html', maximized=True)
    webview.start()
