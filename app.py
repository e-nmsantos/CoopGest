from coopgest import application as _application
from coopgest.application import *  # noqa: F401,F403

_limiter = _application._limiter
_mail_available = _application._mail_available
_is_production = _application._is_production


if __name__ == "__main__":
    init_db()
    app.run(debug=os.environ.get("FLASK_DEBUG", "False") == "True", threaded=True)
