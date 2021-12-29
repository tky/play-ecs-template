package presentation.controllers

import javax.inject._
import play.api._
import play.api.mvc._
import scala.concurrent.{ExecutionContext, Future}

case class LoginForm(email: String, password: String)

@Singleton
class HomeController @Inject() (
    cc: ControllerComponents
)(implicit ec: ExecutionContext)
    extends AbstractController(cc)
    with play.api.i18n.I18nSupport {

  def top() =
    Action { implicit request =>
      Ok(views.html.top())
    }

  def healthChek() =
    Action { implicit request =>
      Ok
    }
}
