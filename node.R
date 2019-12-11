needs(dplyr)
needs(rdwd)
needs(raster)
needs(rgdal)

# TODO implement choosing the radar option depending on input
attach(input[[1]])

# input handling
if( radarProduct == "sf") {
  rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/sf"
  # scale info
}
if( radarProduct == "ry") {
  rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/ry"
  # scale info
}
if( radarProduct == "rw") {
  rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/rw"
  # scale info
}

# https://bookdown.org/brry/rdwd/use-case-recent-hourly-radar-files.html
# radolan see https://www.dwd.de/DE/leistungen/radolan/produktuebersicht/radolan_produktuebersicht_pdf.pdf?__blob=publicationFile&v=7
# rw hourly, after 30min
# 1/10 mm/h
# rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/rw"
# ry 5min, after 2min
# 1/100 mm/5min
# rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/ry"
# sf (sum) hourly, after 40min
# 1/10 mm/d
# rw_base <- "ftp://ftp-cdc.dwd.de/weather/radar/radolan/sf"
# scale_info = "1/10 mm/d"

rw_urls <- indexFTP(base=rw_base, dir=tempdir(), folder="", quiet=TRUE)
rw_file <- dataDWD(rw_urls[length(rw_urls)], base=rw_base, joinbf=TRUE, dir=tempdir(), read=FALSE, quiet=TRUE, dbin=TRUE)

# data & reproject
rw_orig <- dwdradar::readRadarFile(rw_file)
rw_proj <- projectRasterDWD(raster::raster(rw_orig$dat), extent="radolan", quiet=TRUE)

# reclassify
# replace < 0 and 0 with NA, so they're no part of the final product
rw_proj[rw_proj == 0] <- NA
rw_proj[rw_proj < 0] <- NA

# classification
# statistics about data
sum = summary(rw_proj)

if( classification == "quartiles" ) {
  reclass = c(sum[1],sum[2],1, sum[2],sum[3],2, sum[3],sum[4],3, sum[4],sum[5],4)
}
# max is now 10000 TODO if/else decision? how to pass upper margin
if( classification == "dwd" ) {
  if( radarProduct == "rw") {
    # unit: 1/10 mm/h, thus *10 for mm/h values (breaks have been devided by 10)
    reclass = c(0,0.25,1, 0.25,1,2, 1,5,3, 5,10000,4)
  }
  if( radarProduct == "ry") {
    # unit: 1/100 mm/5min, thus *100 *2 for mm/10min (breaks /100 *2)
    reclass = c(0,0.01,1, 0.01,0.034,2, 0.034,0.166,3, 0.166,10000,4)
  }
  if( radarProduct == "sf") {
    # unit: 1/10 mm/d, thus *10 /24 for mm/h (breaks /10 *24)
    reclass = c(0,6,1, 6,24,2, 24,120,3, 120,10000,4)
  }
}

# build matrix
reclass_m = matrix(reclass,
                  ncol = 3,
                  byrow = TRUE)
# reclass
rw_proj_class = reclassify(rw_proj, reclass_m)

# polygon conversion, no python, takes much longer
# pol = rasterToPolygons(rw_proj_class, n = 4, na.rm = TRUE, dissolve = TRUE)

# convert using python
# different approach, see https://johnbaumgartner.wordpress.com/2012/07/26/getting-rasters-into-shape-from-r/
# Define the function
gdal_polygonizeR <- function(x, outshape=NULL, gdalformat = 'ESRI Shapefile',
                             pypath=NULL, readpoly=TRUE, quiet=TRUE) {
  if (isTRUE(readpoly)) require(rgdal)
  if (is.null(pypath)) {
    pypath <- Sys.which('gdal_polygonize.py')
  }
  if (!file.exists(pypath)) stop("Can't find gdal_polygonize.py on your system.")
  owd <- getwd()
  on.exit(setwd(owd))
  setwd(dirname(pypath))
  if (!is.null(outshape)) {
    outshape <- sub('\\.shp$', '', outshape)
    f.exists <- file.exists(paste(outshape, c('shp', 'shx', 'dbf'), sep='.'))
    if (any(f.exists))
      stop(sprintf('File already exists: %s',
                   toString(paste(outshape, c('shp', 'shx', 'dbf'),
                                  sep='.')[f.exists])), call.=FALSE)
  } else outshape <- tempfile()
  if (is(x, 'Raster')) {
    require(raster)
    writeRaster(x, {f <- tempfile(fileext='.tif')})
    rastpath <- normalizePath(f)
  } else if (is.character(x)) {
    rastpath <- normalizePath(x)
  } else stop('x must be a file path (character string), or a Raster object.')
  system2('python', args=(sprintf('"%1$s" "%2$s" -f "%3$s" "%4$s.shp"',
                                  pypath, rastpath, gdalformat, outshape)),
                                  # silence this
                                  stdout = NULL, stderr = NULL)
  if (isTRUE(readpoly)) {
    shp <- readOGR(dirname(outshape), layer = basename(outshape), verbose=!quiet)
    return(shp)
  }
  return(NULL)
}

if(is.na(sum[1])) {
# if no data, return 0,0 to signal no data
result <- cbind(0,0)
} else {
# polygon conversion, python, almost no calculation effort
pol <- gdal_polygonizeR(rw_proj_class)

# transfer into list for JSON readability
meta_offset <- 2
for_length <- length(pol@data[[1]])
list_length <- for_length + meta_offset
all_pol <- vector("list", list_length)

# meta
meta <- rw_orig$meta
# meta from raster as list
all_pol[[1]] <- meta
# meta from classification as matrix
all_pol[[2]] <- list(classes = reclass_m)

for(i in 1:for_length) {
  class = pol@data[[1]][[i]]
  # or without data.frame
  coords = pol@polygons[[i]]@Polygons[[1]]@coords
  l <- list(class = class, coords = coords)
  all_pol[[i + meta_offset]] <- l
}

result <- all_pol
}
