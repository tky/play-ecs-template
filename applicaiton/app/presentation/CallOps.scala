package presentation

import play.api.mvc._
import io.lemonlabs.uri._

object CallOps {
  implicit class CallOps(c: Call) {

    def withQueryString(query: (String, Any)*): Call = {
      val qs = query.flatMap {
        case (key, Some(value)) => Some((key, value.toString))
        case (key, None)        => None
        case (key, value)       => Some((key, value.toString))
      }
      val url = Url.parse(c.url)
      val n = url.addParams(qs)
      Call(c.method, n.toString, c.fragment)
    }
  }
}
