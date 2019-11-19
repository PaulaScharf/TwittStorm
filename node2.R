needs(dplyr)
needs(rdwd)
needs(R.utils)
needs(raster)
needs(rgdal)
needs(RCurl)
needs(dwdradar)
needs(rgeos)
needs(sp)

# TODO implement choosing the radar option depending on input
attach(input[[1]])

result <- json2
