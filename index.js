// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
"use strict";

const functions = require("firebase-functions");
const { WebhookClient } = require("dialogflow-fulfillment");
const bent = require("bent");
const getJSON = bent("json");

process.env.DEBUG = "dialogflow:debug"; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(
  (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log(
      "Dialogflow Request headers: " + JSON.stringify(request.headers)
    );
    console.log("Dialogflow Request body: " + JSON.stringify(request.body));

    function welcome(agent) {
      agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
      agent.add(
        `I think I am not ready for what you're asking. I can help you find stats for any country, state or any county!`
      );
    }

    let finalArr = [];
    let finalMap = {};
    let type = ``;
    for (let parameters in agent.parameters) {
      if (
        agent.parameters[parameters] &&
        agent.parameters[parameters].length > -1
      ) {
        finalMap[parameters] = agent.parameters[parameters];
      }
    }
    finalArr.push(finalMap);

    function worldwideLatestStats(agent) {
      type = agent.parameters.type;
      return getJSON(
        "https://coronavirus-tracker-api.ruizlab.org/v2/latest?source=jhu"
      )
        .then((result) => {
          agent.add("According to my data..");
          for (let i = 0; i < type.length; i++) {
            if (type[i] === "confirmed") {
              agent.add(
                `There are currently ${result.latest.confirmed} confirmed cases of COVID-19.`
              );
            } else if (type[i] === "deaths") {
              agent.add(
                `There are currently ${result.latest.deaths} deaths of COVID-19.`
              );
            } else if (type[i] === "recovered") {
              agent.add(
                `There are currently ${result.latest.recovered} people who have recovered from COVID-19.`
              );
            } else {
              agent.add(
                `There are total ${result.latest.confirmed} confirmed cases of which ${result.latest.deaths} people have died and ${result.latest.recovered} people have recovered from COVID-19.`
              );
            }
          }
        })
        .catch((err) => {
          agent.add(`Sorry the data you are requesting is not available!`);
        });
    }

    function locationStats(agent) {
      let API = `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=`;
      if (
        !agent.parameters.city &&
        finalArr[0].state.length === 0 &&
        finalArr[0].county.length === 0 &&
        finalArr[0].country.length === 0
      ) {
        agent.add(`Sorry. I cannot understand what you are trying to say!`);
      }
      let tempHolder = ``;
      if (agent.parameters.city) {
        agent.add(
          `We are current not ready with city right now. You can try counties, states or country!`
        );
      } else {
        let isCountry = false;
        let isCounty = false;
        let isState = false;

        if (finalArr[0].country) {
          isCountry = true;
        }

        if (finalArr[0].county) {
          isCounty = true;
        }

        if (finalArr[0].state) {
          isState = true;
        }

        if (finalArr[0].type.length === 1) {
          let county = "";
          let state = "";

          let country = "";
          let source = "csbs";
          if (
            finalArr[0].county.length === 1 ||
            finalArr[0].country.length === 1 ||
            finalArr[0].state.length === 1
          ) {
            if (
              isCountry ||
              isState ||
              isCounty ||
              (isCountry && isCounty) ||
              (isCounty && isState) ||
              (isState && isCounty)
            ) {
              for (let arr of finalArr) {
                if (arr.county.length > 0) {
                  tempHolder = arr.county;
                  county += arr.county.join("");

                  if (county.includes(" County")) {
                    county = arr.county.join("").replace(" County", "");
                  } else if (county.includes(" county")) {
                    county = arr.county.join("").replace(" county", "");
                  } else if (county.includes(" Parish")) {
                    county = arr.county.join("").replace(" Parish", "");
                  } else if (county.includes(" parish")) {
                    county = arr.county.join("").replace(" parish", "");
                  }
                }

                if (arr.state.length > 0) {
                  state += arr.state.join("");
                }

                if (arr.type) {
                  type += arr.type.join("");
                }

                if (arr.country.length > 0) {
                  country += arr.country[0]["alpha-2"];
                  tempHolder = arr.country[0].name;
                }
              }
              if (country && country !== "US") {
                source = `jhu`;
              }
              API += `${source}`;
              if (country.length) {
                API += `&country_code=${country}`;
              }
              if (state.length) {
                API += `&province=${state}`;
                tempHolder += ` `;
                tempHolder += state;
              }
              if (county.length) {
                API += `&county=${county}`;
              }

              return getJSON(API)
                .then((result) => {
                  agent.add("According to my latest data");
                  if (type === "confirmed") {
                    agent.add(
                      `There are currently ${result.latest.confirmed} confirmed cases of COVID-19 in ${tempHolder}.`
                    );
                  } else if (type === "deaths") {
                    agent.add(
                      `There are currently ${result.latest.deaths} deaths of COVID-19 in ${tempHolder}.`
                    );
                  } else if (type === "recovered") {
                    agent.add(
                      `There are currently ${result.latest.recovered} people who have recovered from COVID-19 in ${tempHolder}.`
                    );
                  } else {
                    agent.add(
                      `There are total ${result.latest.confirmed} confirmed cases out of which ${result.latest.deaths} have died and ${result.latest.recovered} have recovered in ${tempHolder}`
                    );
                  }
                })
                .catch((err) => {
                  agent.add(
                    `Sorry the data you are requesting for ${tempHolder} is not available!`
                  );
                });
            }
          }
        }
      }
    }

    async function oneTypeMultipleCountries(agent) {
      if (agent.parameters.city) {
        agent.add(
          `We are current not ready with city right now. You can try counties, states or country!`
        );
      } else {
        let sourceArr = [];
        let countryArr = [];
        let source = ``;
        for (let countryinArr of finalArr[0].country) {
          if (countryinArr["alpha-2"] === "US") {
            source = `csbs`;
            sourceArr.push(source);
          } else {
            source = `jhu`;
            sourceArr.push(source);
          }

          countryArr.push(countryinArr["alpha-2"]);
        }
        let sourceToCountry = [];
        for (let i = 0; i < sourceArr.length; i++) {
          sourceToCountry.push([sourceArr[i], countryArr[i]]);
        }
        type = finalArr[0].type.join("");
        let response = getSourceAndCountry(sourceToCountry);

        agent.add(`According to my data.....`);
        try {
          let res = await response;

          for (let i = 0; i < countryArr.length; i++) {
            if (!res[i]) {
              agent.add(`I'm sorry. I could not find data for the country`);
            }
            if (i === 1) {
              agent.add(`In additon`);
            }
            if (type === "confirmed") {
              agent.add(
                `There are ${res[i].latest.confirmed} cases of COVID-19 in ${res[i].locations[0].country}.`
              );
            } else if (type === "deaths") {
              agent.add(
                `Unfortunately, there are ${res[i].latest.deaths} deaths in ${res[i].locations[0].country} due to COVID-19.`
              );
            } else if (type === "recovered") {
              agent.add(
                `Out of ${res[i].latest.confirmed} cases, ${res[i].latest.recovered} have recovered in ${res[i].locations[0].country}!`
              );
            } else {
              agent.add(
                `There have been  ${res[i].latest.confirmed} confirmed cases in ${res[i].locations[0].country} of which ${res[i].latest.deaths} have died and  ${res[i].latest.recovered} have recovered!`
              );
            }
          }
        } catch (err) {
          agent.add(
            `Sorry the data you are requesting for ${tempHolder} is not available!`
          );
        }
      }
    }

    async function getSourceAndCountry(arr) {
      let source = ``;
      let country = ``;
      let response = [];
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
          if (arr[i][j] && arr[i][j + 1]) {
            let API = `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=`;
            source = arr[i][j];
            API += `${source}`;
            country = arr[i][j + 1];
            API += `&country_code=${country}`;
            response.push(await getJSON(API));
          }
        }
      }
      return response;
    }

    async function oneTypeManyStates(agent) {
      if (
        !agent.parameters.city &&
        finalArr[0].state.length === 0 &&
        finalArr[0].county.length === 0 &&
        finalArr[0].country.length === 0
      ) {
        agent.add(`Sorry. I cannot understand what you are trying to say!`);
      }
      if (agent.parameters.city) {
        agent.add(
          `We are current not ready with city right now. You can try counties, states or country!`
        );
      } else {
        let statesArr = [];
        for (let states of finalArr[0].state) {
          statesArr.push(states);
        }
        type = finalArr[0].type.join("");

        let response = getStates(statesArr);
        agent.add(`According to my data.....`);
        try {
          let res = await response;
          for (let i = 0; i < statesArr.length; i++) {
            if (!res[i]) {
              agent.add(`I'm sorry. I could not find data for the country`);
            }

            if (i === 1) {
              agent.add(`In addition, `);
            }
            if (i === 2) {
              agent.add(`Moreover,`);
            }
            if (type === "confirmed") {
              agent.add(
                `There are ${res[i].latest.confirmed} cases in ${res[i].locations[0].province} due to COVID-19.`
              );
            } else if (type === "deaths") {
              agent.add(
                `There are ${res[i].latest.deaths} deaths in ${res[i].locations[0].province} due to COVID-19.`
              );
            } else if (type === "recovered") {
              agent.add(
                ` In ${res[i].locations[0].province}, ${res[i].latest.recovered} patients have recovered!`
              );
            } else {
              agent.add(
                `There have been ${res[i].latest.confirmed} cases of COVID-19, out of which ${res[i].latest.deaths} have died and ${res[i].latest.recovered} have recovered in ${res[i].locations[0].province}.`
              );
            }
          }
        } catch (err) {
          agent.add(
            `Sorry the data you are requesting for States is not available!`
          );
        }
      }
    }

    async function getStates(arr) {
      let response = [];
      let state = ``;
      for (let i = 0; i < arr.length; i++) {
        let API = `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=csbs&country_code=US&province=`;
        state = arr[i];
        API += `${state}`;
        response.push(await getJSON(API));
      }
      return response;
    }

    async function oneTypeMultipleCounties(agent) {
      if (
        !agent.parameters.city &&
        finalArr[0].state.length === 0 &&
        finalArr[0].county.length === 0 &&
        finalArr[0].country.length === 0
      ) {
        agent.add(`Sorry. I cannot understand what you are trying to say!`);
      }
      if (agent.parameters.city) {
        agent.add(
          `We are current not ready with city right now. You can try counties, states or country!`
        );
      } else {
        if (finalArr[0].state.length > 1) {
          let statesArr = [];
          let countiesArr = [];
          let countyString = ``;
          let tempHolder = ``;
          for (let states of finalArr[0].state) {
            statesArr.push(states);
          }
          type = finalArr[0].type.join("");
          for (let county of finalArr[0].county) {
            countyString += county;
            tempHolder = countyString;
            if (countyString.includes(" County")) {
              countyString = county.replace(" County", "");
            } else if (county.includes(" county")) {
              countyString = county.replace(" county", "");
            } else if (county.includes(" Parish")) {
              countyString = county.replace(" Parish", "");
            } else if (county.includes(" parish")) {
              countyString = county.replace(" parish", "");
            }
            countiesArr.push(countyString);
          }
          let stateToCounty = [];
          for (let i = 0; i < countiesArr.length; i++) {
            stateToCounty.push([statesArr[i], countiesArr[i]]);
          }

          let response = getStateAndCounties(stateToCounty);
          try {
            let res = await response;
            for (let i = 0; i < statesArr.length; i++) {
              if (i === 1) {
                agent.add(`In addition, `);
              }
              if (i === 2) {
                agent.add(`Moreover,`);
              }
              if (type === "confirmed") {
                agent.add(
                  `There are ${res[i].latest.confirmed} cases of COVID-19 in ${tempHolder}.`
                );
              } else if (type === "deaths") {
                agent.add(
                  `Unfortunately, ${res[i].latest.deaths} people have died due to COVID-19 in ${tempHolder}.`
                );
              } else if (type === "recovered") {
                agent.add(
                  `At the moment, ${res[i].latest.recovered} patients have recovered in ${tempHolder}.`
                );
              } else {
                agent.add(
                  `There are total ${res[i].latest.confirmed} cases of COVID-19, in which ${res[i].latest.death} have occurred and ${res[i].latest.recovered} have recovered in ${tempHolder}.`
                );
              }
            }
          } catch (err) {
            agent.add(
              `Sorry the data you are requesting for counties is not available!`
            );
          }
        } else {
          let countiesArr = [];
          let countyString = ``;
          type = finalArr[0].type.join("");
          if (
            finalArr[0].state.length === 0 &&
            finalArr[0].county.length === 0
          ) {
            agent.add(`Sorry. I cannot understand what you are trying to say!`);
          }
          for (let county of finalArr[0].county) {
            countyString += county;
            if (countyString.includes(" County")) {
              countyString = county.replace(" County", "");
            } else if (county.includes(" county")) {
              countyString = county.replace(" county", "");
            } else if (county.includes(" Parish")) {
              countyString = county.replace(" Parish", "");
            } else if (county.includes(" parish")) {
              countyString = county.replace(" parish", "");
            }
            countiesArr.push(countyString);
          }
          let response = getCounties(countiesArr);

          let res = await response;
          try {
            for (let i = 0; i < countiesArr.length; i++) {
              if (i === 1) {
                agent.add(`In addition, `);
              }
              if (i === 2) {
                agent.add(`Moreover,`);
              }
              if (type === "confirmed") {
                agent.add(
                  `There are ${res[i].latest.confirmed} cases in ${res[i].locations[0].county} county.`
                );
              } else if (type === "deaths") {
                agent.add(
                  `There are ${res[i].latest.deaths} deaths in ${res[i].locations[0].county} county.`
                );
              } else if (type === "recovered") {
                agent.add(
                  ` In ${res[i].locations[0].county} county, ${res[i].latest.recovered} patients have recovered!`
                );
              } else {
                agent.add(
                  `There have been ${res[i].latest.confirmed} cases of COVID-19, out of which ${res[i].latest.deaths} have died and ${res[i].latest.recovered} have recovered in ${res[i].locations[0].county} county.`
                );
              }
            }
          } catch (err) {
            agent.add(
              `The data you are requesting for counties is not available!`
            );
          }
        }
      }
    }

    async function getCounties(arr) {
      let response = [];
      let county = ``;
      for (let i = 0; i < arr.length; i++) {
        let API = `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=csbs&county=`;
        county = arr[i];
        API += `${county}`;
        response.push(await getJSON(API));
      }
      return response;
    }

    async function getStateAndCounties(arr) {
      let response = [];
      let state = ``;
      let county = ``;
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
          if (arr[i][j] && arr[i][j + 1]) {
            let API = `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=csbs&country_code=US&province=`;
            state = arr[i][j];
            API += `${state}`;
            county = arr[i][j + 1];
            API += `&county=${county}`;
            response.push(await getJSON(API));
          }
        }
      }
      return response;
    }

    async function multipleTypeMultipleCountries(agent) {
      let source = ``;
      let sourceArr = [];
      let countryArr = [];
      let temp = [];
      let dateArr = [];
      let tempString = `00:00:00Z`;
      let today = new Date()
        .toISOString()
        .slice(0, 10)
        .concat("T")
        .concat(tempString);
      if (agent.parameters.city) {
        agent.add(
          `We are current not ready with city right now. You can try counties, states or country!`
        );
      } else {
        if (finalArr[0].date.length > 0) {
          for (let arr of finalArr[0].date) {
            for (let obj in arr) {
              temp.push(`${arr[obj].substring(0, 11)}`);
            }
          }

          for (let elem of temp) {
            dateArr.push(elem.concat(tempString));
          }

          for (let countryinArr of finalArr[0].country) {
            source = `jhu`;
            sourceArr.push(source);

            countryArr.push(countryinArr["alpha-2"]);
          }
          let sourceToCountry = [];
          for (let i = 0; i < sourceArr.length; i++) {
            sourceToCountry.push([sourceArr[i], countryArr[i]]);
          }
          let response = getSourceAndCountryAndTime(sourceToCountry);
          let res = await response;
          let startVal = 0;
          let endVal = 0;

          if (finalArr[0].type[0] === "confirmed") {
            for (let location of res[0].locations) {
              let { timeline } = location.timelines.confirmed;
              for (let property in timeline) {
                if (dateArr[0] === property) {
                  startVal += timeline[property];
                }
                if (dateArr[1] === property) {
                  endVal += timeline[property];
                }
              }
            }

            if (dateArr[1] === today) {
              agent.add(
                `There have been ${Math.abs(
                  res[0].latest.confirmed - startVal
                )} confirmed cases of COVID-19 in ${
                  res[0].locations[0].country
                }`
              );
            } else {
              agent.add(
                `There have been ${Math.abs(
                  endVal - startVal
                )} cases of COVID-19 in ${
                  res[0].locations[0].country
                } during that time!`
              );
            }
          } else if (finalArr[0].type[0] === "deaths") {
            for (let location of res[0].locations) {
              let { timeline } = location.timelines.deaths;
              for (let property in timeline) {
                if (dateArr[0] === property) {
                  startVal += timeline[property];
                }
                if (dateArr[1] === property) {
                  endVal += timeline[property];
                }
              }
            }
            if (dateArr[1] === today) {
              agent.add(
                `There have been ${Math.abs(
                  res[0].latest.deaths - startVal
                )} confirmed cases of COVID-19 in ${
                  res[0].locations[0].country
                }`
              );
            } else {
              agent.add(
                `There have been ${Math.abs(
                  endVal - startVal
                )} deaths of COVID-19 in ${
                  res[0].locations[0].country
                } during that time!`
              );
            }
          } else if (finalArr[0].type[0] === "recovered") {
            for (let location of res[0].locations) {
              let { timeline } = location.timelines.recovered;
              for (let property in timeline) {
                if (dateArr[0] === property) {
                  startVal += timeline[property];
                }
                if (dateArr[1] === property) {
                  endVal += timeline[property];
                }
              }
            }
            if (dateArr[1] === today) {
              agent.add(
                `There have been ${Math.abs(
                  res[0].latest.recovered - startVal
                )} confirmed cases of COVID-19 ${res[0].locations[0].country}`
              );
            } else {
              agent.add(
                `There have been ${Math.abs(
                  endVal - startVal
                )} recovery of COVID-19 patients in ${
                  res[0].locations[0].country
                } during that time!`
              );
            }
          } else {
            agent.add(`Inside the required!`);
            let startValConfirmed = 0;
            let endValConfirmed = 0;
            let startValDeaths = 0;
            let endValDeaths = 0;
            let startValRecovery = 0;
            let endValRecovery = 0;
            for (let location of res[0].locations) {
              let { confirmed } = location.timelines;
              for (var property in confirmed.timeline) {
                if (dateArr[0] === property) {
                  startValConfirmed += timeline[property];
                }
                if (dateArr[1] === property) {
                  endValConfirmed += timeline[property];
                }
              }
              let { deaths } = location.timelines;
              let { timeline } = deaths;
              for (let property in timeline) {
                if (dateArr[0] === property) {
                  startValDeaths += timeline[property];
                }
                if (dateArr[1] === property) {
                  endValDeaths += timeline[property];
                }
              }
              let { recovered } = location.timelines;
              let { timeline } = recovered;
              for (let property in recovered.timeline) {
                if (dateArr[0] === property) {
                  startValRecovery += timeline[property];
                }
                if (dateArr[1] === property) {
                  endValRecovery += timeline[property];
                }
              }
            }

            agent.add(
              `There have been ${
                endValConfirmed - startValConfirmed
              } confirmed cases so far out of which ${
                endValDeaths - startValDeaths
              } deaths have occurred and ${
                endValRecovery - startValRecovery
              } have recovered in ${res[0].locations[0].country}`
            );
          }
        } else {
          let sourceArr = [];
          let countryArr = [];
          let source = ``;

          for (let countryinArr of finalArr[0].country) {
            if (countryinArr["alpha-2"] === "US") {
              source = `csbs`;
              sourceArr.push(source);
            } else {
              source = `jhu`;
              sourceArr.push(source);
            }

            countryArr.push(countryinArr["alpha-2"]);
          }
          let sourceToCountry = [];
          for (let i = 0; i < sourceArr.length; i++) {
            sourceToCountry.push([sourceArr[i], countryArr[i]]);
          }
          let response = getSourceAndCountry(sourceToCountry);
          agent.add(`According to my data.....`);
          try {
            let res = await response;

            for (let i = 0; i < countryArr.length; i++) {
              if (i === 1) {
                agent.add(`In addition, `);
              }
              if (i === 2) {
                agent.add(`Moreover,`);
              }

              if (finalArr[0].type[i] === "confirmed") {
                agent.add(
                  `There are ${res[i].latest.confirmed} confirmed cases of COVID-19 in ${res[i].locations[0].country}.`
                );
              } else if (finalArr[0].type[i] === "deaths") {
                agent.add(
                  `Unfortunately, there are ${res[i].latest.deaths} deaths in ${res[i].locations[0].country} due to COVID-19.`
                );
              } else if (finalArr[0].type[i] === "recovered") {
                agent.add(
                  `Out of ${res[i].latest.confirmed} cases, ${res[i].latest.recovered} have recovered in ${res[i].locations[0].country}!`
                );
              } else {
                agent.add(
                  `There have been  ${res[i].latest.confirmed} confirmed cases in ${res[i].locations[0].country} of which ${res[i].latest.deaths} have died and  ${res[i].latest.recovered} have recovered!`
                );
              }
            }
          } catch (err) {
            agent.add(
              `Sorry the data you are requesting for countries is not available!`
            );
          }
        }
      }
    }
    async function getSourceAndCountryAndTime(arr) {
      let source = ``;
      let country = ``;
      let response = [];
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
          if (arr[i][j] && arr[i][j + 1]) {
            let API = `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=`;
            source = arr[i][j];
            API += `${source}`;
            country = arr[i][j + 1];
            API += `&country_code=${country}&timelines=true`;
            response.push(await getJSON(API));
          }
        }
      }
      return response;
    }
    async function multipleTypeMultipleStates(agent) {
      if (
        !agent.parameters.city &&
        finalArr[0].state.length === 0 &&
        finalArr[0].county.length === 0 &&
        finalArr[0].country.length === 0
      ) {
        agent.add(`Sorry. I cannot understand what you are trying to say!`);
      }
      let statesArr = [];
      for (let states of finalArr[0].state) {
        statesArr.push(states);
      }
      if (agent.parameters.city) {
        agent.add(
          `We are current not ready with city right now. You can try counties, states or country!`
        );
      } else {
        let response = getStates(statesArr);
        agent.add(`According to my data.....`);
        try {
          let res = await response;
          for (let i = 0; i < statesArr.length; i++) {
            if (!res[i]) {
              agent.add(`I'm sorry. I could not find data for the state!`);
            }

            if (i === 1) {
              agent.add(`In addition, `);
            }
            if (i === 2) {
              agent.add(`Moreover,`);
            }
            if (finalArr[0].type[i] === "confirmed") {
              agent.add(
                `There are ${res[i].latest.confirmed} cases in ${res[i].locations[0].province}`
              );
            } else if (finalArr[0].type[i] === "deaths") {
              agent.add(
                `There are ${res[i].latest.deaths} deaths in ${res[i].locations[0].province}`
              );
            } else if (finalArr[0].type[i] === "recovered") {
              agent.add(
                ` In ${res[i].locations[0].province}, ${res[i].latest.recovered} patients have recovered!`
              );
            } else {
              agent.add(
                `There have been ${res[i].latest.confirmed} cases of COVID-19, out of which ${res[i].latest.deaths} have died and ${res[i].latest.recovered} have recovered in ${res[i].locations[0].province}.`
              );
            }
          }
        } catch (err) {
          agent.add(
            `Sorry the data you are requesting for states is not available!`
          );
        }
      }
    }

    async function multipleTypeMultipleCounties(agent) {
      if (
        !agent.parameters.city &&
        finalArr[0].state.length === 0 &&
        finalArr[0].county.length === 0 &&
        finalArr[0].country.length === 0
      ) {
        agent.add(`Sorry. I cannot understand what you are trying to say!`);
      }
      if (agent.parameters.city) {
        agent.add(
          `We are current not ready with city right now. You can try counties, states or country!`
        );
      } else {
        if (finalArr[0].state.length > 1) {
          let statesArr = [];
          let countiesArr = [];
          let countyString = ``;
          for (let states of finalArr[0].state) {
            statesArr.push(states);
          }

          for (let county of finalArr[0].county) {
            countyString += county;
            if (countyString.includes(" County")) {
              countyString = county.replace(" County", "");
            } else if (county.includes(" county")) {
              countyString = county.replace(" county", "");
            }
            countiesArr.push(countyString);
          }
          let stateToCounty = [];
          for (let i = 0; i < countiesArr.length; i++) {
            stateToCounty.push([statesArr[i], countiesArr[i]]);
          }

          let response = getStateAndCounties(stateToCounty);

          try {
            let res = await response;
            agent.add(`According to my data`);

            for (let i = 0; i < statesArr.length; i++) {
              if (!res[i]) {
                agent.add(`I'm sorry. I could not find data for the county`);
              }

              if (i === 1) {
                agent.add(`In addition, `);
              }
              if (i === 2) {
                agent.add(`Moreover,`);
              }
              if (finalArr[0].type[i] === "confirmed") {
                agent.add(
                  `There are ${res[i].latest.confirmed} cases of COVID-19 in ${res[i].locations[0].county} county.`
                );
              } else if (finalArr[0].type[i] === "deaths") {
                agent.add(
                  `Unfortunately, ${res[i].latest.deaths} people have died due to COVID-19 in ${res[i].locations[0].county} county.`
                );
              } else if (finalArr[0].type[i] === "recovered") {
                agent.add(
                  `At the moment, ${res[i].latest.recovered} patients have recovered in ${res[i].locations[0].county} county.`
                );
              } else {
                agent.add(
                  `There are total ${res[i].latest.confirmed} cases of COVID-19, in which ${res[i].latest.deaths} have occurred and ${res[i].latest.recovered} have recovered in ${res[i].locations[0].county} county.`
                );
              }
            }
          } catch (err) {
            agent.add(`Sorry the data you are requesting is not available!`);
          }
        } else {
          let countiesArr = [];
          let countyString = ``;
          for (let county of finalArr[0].county) {
            countyString += county;
            if (countyString.includes(" County")) {
              countyString = county.replace(" County", "");
            } else if (county.includes(" county")) {
              countyString = county.replace(" county", "");
            }
            countiesArr.push(countyString);
          }
          let response = getCounties(countiesArr);

          agent.add(`According to my data.....`);
          try {
            let res = await response;
            for (let i = 0; i < countiesArr.length; i++) {
              if (!res[i]) {
                agent.add(`I'm sorry. I could not find data for the county`);
              }

              if (i === 1) {
                agent.add(`In addition, `);
              }
              if (i === 2) {
                agent.add(`Moreover,`);
              }
              if (finalArr[0].type[i] === "confirmed") {
                agent.add(
                  `There are ${res[i].latest.confirmed} cases in ${res[i].locations[0].county} county.`
                );
              } else if (finalArr[0].type[i] === "deaths") {
                agent.add(
                  `There are ${res[i].latest.deaths} deaths in ${res[i].locations[0].county} county.`
                );
              } else if (finalArr[0].type[i] === "recovered") {
                agent.add(
                  ` In ${res[i].locations[0].province}, ${res[i].latest.recovered} patients have recovered in ${res[i].locations[0].county} county.!`
                );
              } else {
                agent.add(
                  `There have been ${res[i].latest.confirmed} cases of COVID-19, out of which ${res[i].latest.deaths} have died and ${res[i].latest.recovered} have recovered in ${res[i].locations[0].county} county.`
                );
              }
            }
          } catch (err) {
            agent.add(
              `Sorry the data you are requesting for counties is not available!`
            );
          }
        }
      }
    }

    let intentMap = new Map();
    intentMap.set("Default Welcome Intent", welcome);
    intentMap.set("Default Fallback Intent", fallback);
    intentMap.set("WorldWideLatestStats", worldwideLatestStats);
    intentMap.set("LocationStats", locationStats);
    intentMap.set("OneTypeMultipleCountries", oneTypeMultipleCountries);
    intentMap.set("OneTypeManyStates", oneTypeManyStates);
    intentMap.set("OneTypeMultipleCounties", oneTypeMultipleCounties);
    intentMap.set(
      "MultipleTypeMultipleCountries",
      multipleTypeMultipleCountries
    );
    intentMap.set("MultipleTypeMultipleStates", multipleTypeMultipleStates);
    intentMap.set("MultipleTypeMultipleCounties", multipleTypeMultipleCounties);

    // intentMap.set('your intent name here', yourFunctionHandler);
    // intentMap.set('your intent name here', googleAssistantHandler);
    agent.handleRequest(intentMap);
  }
);
