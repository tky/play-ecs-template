package infrastructure.filter

import javax.inject.{Singleton, Inject}
import akka.stream.Materializer
import play.api.Logger
import play.api.mvc._
import scala.concurrent.{ExecutionContext, Future}

@Singleton
class SecurityFilter @Inject() (implicit
    val mat: Materializer,
    ec: ExecutionContext
) extends Filter {

  def apply(
      nextFilter: RequestHeader => Future[Result]
  )(requestHeader: RequestHeader): Future[Result] = {

    val startTime = System.currentTimeMillis

    nextFilter(requestHeader).map { result =>
      val endTime = System.currentTimeMillis
      val requestTime = endTime - startTime
      result.withHeaders(
        "cache-control" -> "max-age=0, private, must-revalidate"
      )
    }
  }
}
