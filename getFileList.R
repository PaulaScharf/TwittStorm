needs(dplyr)
needs(rdwd)

attach(input[[1]])

rw_base <- paste(dwdUrl,radarProduct,sep="")

rw_urls <- indexFTP(base=rw_base, dir=tempdir(), folder="", quiet=TRUE)

result <- rw_urls
