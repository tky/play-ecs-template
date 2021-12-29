import javax.inject.Inject

import play.api.http.EnabledFilters
import play.api.http.DefaultHttpFilters
import infrastructure.filter.SecurityFilter

class Filters @Inject() (
    defaultFilters: EnabledFilters,
    security: SecurityFilter
) extends DefaultHttpFilters(defaultFilters.filters :+ security: _*)
