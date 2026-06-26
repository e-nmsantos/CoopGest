from coopgest.application import app, create_app


def test_create_app_returns_configured_flask_app():
    assert create_app() is app
