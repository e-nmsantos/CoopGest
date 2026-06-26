from flask import Flask


def register_blueprints(app: Flask) -> None:
    from .auth import bp as auth_bp
    from .backups import bp as backups_bp
    from .exports import bp as exports_bp
    from .procurement import bp as procurement_bp
    from .beneficiaries import bp as beneficiaries_bp
    from .budget import bp as budget_bp
    from .comments import bp as comments_bp
    from .dashboard import bp as dashboard_bp
    from .discovery import bp as discovery_bp
    from .documents import bp as documents_bp
    from .feedback import bp as feedback_bp
    from .finances import bp as finances_bp
    from .frontend import bp as frontend_bp
    from .funding import bp as funding_bp
    from .impact import bp as impact_bp
    from .legacy import register_legacy_routes
    from .lessons import bp as lessons_bp
    from .milestones import bp as milestones_bp
    from .notifications import bp as notifications_bp
    from .partners import bp as partners_bp
    from .project_admin import bp as project_admin_bp
    from .project_reports import bp as project_reports_bp
    from .projects import bp as projects_bp
    from .realtime import bp as realtime_bp
    from .risks import bp as risks_bp
    from .skills import bp as skills_bp
    from .system import bp as system_bp
    from .task_details import bp as task_details_bp
    from .tasks import bp as tasks_bp
    from .templates import bp as templates_bp
    from .voting import bp as voting_bp
    from .work_overview import bp as work_overview_bp
    from .work_tracking import bp as work_tracking_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(backups_bp)
    app.register_blueprint(exports_bp)
    app.register_blueprint(procurement_bp)
    app.register_blueprint(beneficiaries_bp)
    app.register_blueprint(budget_bp)
    app.register_blueprint(comments_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(discovery_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(finances_bp)
    app.register_blueprint(funding_bp)
    app.register_blueprint(impact_bp)
    app.register_blueprint(lessons_bp)
    register_legacy_routes(app)
    app.register_blueprint(milestones_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(partners_bp)
    app.register_blueprint(project_admin_bp)
    app.register_blueprint(project_reports_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(realtime_bp)
    app.register_blueprint(risks_bp)
    app.register_blueprint(skills_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(task_details_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(templates_bp)
    app.register_blueprint(voting_bp)
    app.register_blueprint(work_overview_bp)
    app.register_blueprint(work_tracking_bp)
    app.register_blueprint(frontend_bp)
