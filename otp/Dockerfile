FROM openjdk:21-jdk-slim

ARG OTP_VERSION=2.7.0
ENV OTP_JAR=/otp/otp-shaded-${OTP_VERSION}.jar

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget unzip osmium-tool ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /otp

# Japan map
RUN wget -O japan-latest.osm.pbf https://download.geofabrik.de/asia/japan-latest.osm.pbf 

# Trim map to Okinawa
RUN osmium extract --bbox 127.2,25.7,128.5,26.9 -o okinawa.osm.pbf japan-latest.osm.pbf \
 && rm -f japan-latest.osm.pbf

# GTFS
RUN wget -O okinawa-gtfs.zip https://s3.transitpdf.com/files/uran/improved-gtfs-okinawa.zip

# Jar
RUN wget -O ${OTP_JAR} https://repo1.maven.org/maven2/org/opentripplanner/otp-shaded/${OTP_VERSION}/otp-shaded-${OTP_VERSION}.jar 

# Generate graph
RUN java -Xmx5G -jar ${OTP_JAR} --build --save .

EXPOSE 8080

#CMD ["java","-Xmx5G","-jar","${OTP_JAR}","--load","."]
CMD ["sh","-c","exec java -Xmx5G -jar ${OTP_JAR} --load ."]