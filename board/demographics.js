///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// (1) GET CDC DATA

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getData(url) {
    let response = '';
    let xhr = new XMLHttpRequest();
    if(xhr != null) {
        xhr.open('GET', url, false);
        xhr.send(null);
        response = xhr.responseText;
    }
    return response;
}
let demographicsURL = getData('https://data.cdc.gov/resource/ks3g-spdg.json?$limit=1000000')
let CDCdata = JSON.parse(demographicsURL)
// console.log(CDCdata)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// (2) FILTER AND PLOT CDC DATA

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// (2.1) Organize data by race

const raceData = []
for (let i = 0; i < CDCdata.length; i++) 
    raceData.push(CDCdata[i].race_and_hispanic_origin)
function getUniqueValues(value, index, self) {
    return self.indexOf(value) === index;
}
let uniqueRaces = raceData.filter(getUniqueValues);

let dataByRace = []
for(let i = 0; i < uniqueRaces.length; i++) 
    dataByRace.push(CDCdata.filter(data => data.race_and_hispanic_origin == uniqueRaces[i]))

const endWeeks = []
for (let i = 0; i < CDCdata.length; i++) 
    endWeeks.push(CDCdata[i].end_week)

// --------------------------------------------------------------------------------------------------------

// (2.2) Create traces for plot

let allTraces = [];

function getPlotData(raceArray) {

    for(let e = 1; e < raceArray.length; e++) {

        let currentObj = {}

        let currentRace = raceArray[e]

        // (2.2.1) Filter properties of all data
        let filteredProps = []
        for(let i = 0; i < currentRace.length; i++)
            filteredProps.push( (({age_group, covid_19_deaths}) => ({age_group, covid_19_deaths}))(currentRace[i]) );

        //(2.2.2) Remove entries where covid_19_deaths = Undefined
        noUndefineds = []
        for(let i = 0; i < filteredProps.length; i++) 
            if(filteredProps[i]['covid_19_deaths'] != undefined) 
                noUndefineds.push(filteredProps[i])

        // (2.2.3) Group data by age group
        function groupBy(arr, property) {
            return arr.reduce(function(memo, x) {
                if (!memo[x[property]])
                    memo[x[property]] = []; 
                memo[x[property]].push(x);
                return memo;
            }, {});
        }
        var groupedData = groupBy(noUndefineds, 'age_group'); 

        // (2.2.4) Get all unique ages
        let uniqueAges = Object.getOwnPropertyNames(groupedData)

        // (2.2.5) Get number of deaths 
        let numDeathsArray = []
        numDeathsArray.length = uniqueAges.length;
        numDeathsArray.fill(0)
        for(let i = 0; i < uniqueAges.length; i++) 
            for(let j = 0; j < noUndefineds.length; j++) 
                if(noUndefineds[j].age_group == uniqueAges[i]) 
                    numDeathsArray[i] += parseInt(noUndefineds[j].covid_19_deaths);

        // (2.2.6) Append data to current trace (i.e., currentObj)
        currentObj.x = uniqueAges;
        currentObj.y = numDeathsArray;
        currentObj.name = uniqueRaces[e]; // corresponds to text outside tooltip box and legend
        currentObj.type = 'bar'
        allTraces.push(currentObj);
    }

}

getPlotData(dataByRace);

// --------------------------------------------------------------------------------------------------------

// (2.3) Set up plot layout

let layout = {
    barmode: 'group',
    title: 'COVID-19 Mortality in the United States: Deaths to\t' + endWeeks[0].slice(0,10),
    xaxis: {
        title: 'Age Group',
    },
    yaxis: {
        title: {
            text: 'Number of Deaths',
            standoff: 10
        }
    },
    showlegend: true,
    hoverlabel: {namelength: -1} // ensures that text outside tooltip box is not cut off
}

// --------------------------------------------------------------------------------------------------------

// (2.4) Plot data

Plotly.newPlot('demographicsDiv', allTraces, layout);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////