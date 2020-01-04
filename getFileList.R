needs(dplyr)
needs(rdwd)

attach(input[[1]])

# input handling
if( radarProduct == "sf") {
  rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/sf"
}
if( radarProduct == "ry") {
  rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/ry"
}
if( radarProduct == "rw") {
  rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/rw"
}

rw_urls <- indexFTP(base=rw_base, dir=tempdir(), folder="", quiet=TRUE)

result <- rw_urls