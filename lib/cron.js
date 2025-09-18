/*
 * Licensed Software
 * For authorized client use only.
 * Unauthorized modification or redistribution is prohibited.
 * Full license terms available in LICENSE.md
 */

import cron from "cron";
import http from "http";
import https from "https";
import url from "url";

const job = new cron.CronJob("*/10 * * * *", function () {
  const parsedUrl = url.parse(process.env.API_URL);
  const client = parsedUrl.protocol === "http:" ? http : https;

  client
    .get(process.env.API_URL, (res) => {
      if (res.statusCode === 200) {
        console.log("Get request sent successfully");
      } else {
        console.log("Get request failed", res.statusCode);
      }
    })
    .on("error", (e) => console.error("Error while sending request", e));
});

export default job;
