package presentation

import play.api.mvc.Result
import play.api.mvc.Results.InternalServerError
import play.api.Logger

object ErrorHandler {

  val logger: Logger = Logger(this.getClass())

  val internalServerError = handleInternalServerError _

  def handleInternalServerError(err: Throwable): Result = {
    logger.error(err.getMessage(), err)
    InternalServerError
  }

  def internalServerError(message: String): Result = {
    logger.error(message)
    InternalServerError
  }
}
