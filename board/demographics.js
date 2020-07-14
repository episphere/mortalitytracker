
// (2.0) Get CDC data

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

// --------------------------------------------------------------------------------------------------------

// (2.1) Organize data by races needed for plot

let dataByRace = []
dataByRace.push(CDCdata.filter(data => data.race_and_hispanic_origin == "Non-Hispanic White")) // 0 
dataByRace.push(CDCdata.filter(data => data.race_and_hispanic_origin == "Non-Hispanic Black")) // 1
dataByRace.push(CDCdata.filter(data => data.race_and_hispanic_origin == "Non-Hispanic American Indian or Alaska Native")) // 2
dataByRace.push(CDCdata.filter(data => data.race_and_hispanic_origin == "Non-Hispanic Asian")) // 3
dataByRace.push(CDCdata.filter(data => data.race_and_hispanic_origin == "Non-Hispanic Native Hawaiian or Other Pacific Islander")) // 4
dataByRace.push(CDCdata.filter(data => data.race_and_hispanic_origin == "Hispanic or Latino")) // 5

// --------------------------------------------------------------------------------------------------------

// (2.2) Get date that data were last updated

const endWeeks = []
for (let i = 0; i < CDCdata.length; i++) 
    endWeeks.push(CDCdata[i].end_week)

// --------------------------------------------------------------------------------------------------------

// (2.3) Create array (finalTotalDeaths) with most-updated counts of deaths from COVID-19 for each group

var allNumDeathsArray = []

function getNumberOfDeaths(raceArray) {

    for(let e = 0; e < raceArray.length; e++) {

        let currentRace = raceArray[e]

        // (2.3.1) Filter properties of all data
        let filteredProps = []
        for(let i = 0; i < currentRace.length; i++)
            filteredProps.push( (({age_group, covid_19_deaths}) => ({age_group, covid_19_deaths}))(currentRace[i]) );

        //(2.3.2) Remove entries where covid_19_deaths = Undefined
        noUndefineds = []
        for(let i = 0; i < filteredProps.length; i++) 
            if(filteredProps[i]['covid_19_deaths'] != undefined) 
                noUndefineds.push(filteredProps[i])

        // (2.3.3) Group data by age group
        function groupBy(arr, property) {
            return arr.reduce(function(memo, x) {
                if (!memo[x[property]])
                    memo[x[property]] = []; 
                memo[x[property]].push(x);
                return memo;
            }, {});
        }
        var groupedData = groupBy(noUndefineds, 'age_group'); 

        // (2.3.4) Get all unique ages (except for "All Ages")
        let uniqueAges = Object.getOwnPropertyNames(groupedData)
        let finalUniqueAges = [];
        for(let i = 1; i < uniqueAges.length; i++)
            finalUniqueAges.push(uniqueAges[i])    

        // (2.3.5) Get number of deaths 
        let numDeathsArray = []
        numDeathsArray.length = finalUniqueAges.length;
        numDeathsArray.fill(0)
        for(let i = 0; i < finalUniqueAges.length; i++) 
            for(let j = 0; j < noUndefineds.length; j++) 
                if(noUndefineds[j].age_group == finalUniqueAges[i]) 
                    numDeathsArray[i] += parseInt(noUndefineds[j].covid_19_deaths);
        allNumDeathsArray.push(numDeathsArray)
    }

    // (2.3.6) Merge data for "Non-Hispanic Asian" and "Non-Hispanic Native Hawaiian or Other Pacific Islander"
    for(let i = 0; i < allNumDeathsArray[3].length; i++) 
        allNumDeathsArray[3][i] += allNumDeathsArray[4][i]
    let finalTotalDeaths = [];
    for(let i = 0; i < allNumDeathsArray.length; i++)
        if(i != 4)
            finalTotalDeaths.push(allNumDeathsArray[i])

    return finalTotalDeaths

}

let finalTotalDeaths = getNumberOfDeaths(dataByRace)

// --------------------------------------------------------------------------------------------------------

// (2.4) Create array (populationsArr) of populations for each group

d3.csv('cdcWONDER_population.csv').then(function(data) {

    let finalUniqueRaces = ["Non-Hispanic White", "Non-Hispanic Black", "Non-Hispanic American Indian or Alaska Native", "Non-Hispanic Asian or Pacific Islander", "Hispanic or Latino"]

    let populationsArr = new Array(5).fill(0).map(() => new Array(11).fill(0));

    // Group data by age group
    function groupBy(arr, property) {
        return arr.reduce(function(memo, x) {
            if (!memo[x[property]])
                memo[x[property]] = []; 
            memo[x[property]].push(x);
            return memo;
        }, {});
    }
    var groupedData = groupBy(noUndefineds, 'age_group'); 

    // Get all unique ages (except for "All Ages")
    let uniqueAges = Object.getOwnPropertyNames(groupedData)
    let finalUniqueAges = [];
    for(let i = 1; i < uniqueAges.length; i++)
        finalUniqueAges.push(uniqueAges[i])
    
    for(let i = 0; i < finalUniqueRaces.length; i++) 
        for(let j = 0; j < finalUniqueAges.length; j++) 
            for(let k = 0; k < data.length; k++) 
                if(data[k].race_and_hispanic_origin == finalUniqueRaces[i] && data[k].age_group == finalUniqueAges[j]) 
                    populationsArr[i][j] = parseInt(data[k].population);


// --------------------------------------------------------------------------------------------------------

    // (2.5) Create array (mortalityRateArray) of mortality rates for each group

    let mortalityRateArray = new Array(5).fill(0).map(() => new Array(11).fill(0));

    for(let i = 0; i < mortalityRateArray.length; i++) 
        for(let j = 0; j < mortalityRateArray[i].length; j++) 
            mortalityRateArray[i][j] = ((finalTotalDeaths[i][j] / populationsArr[i][j]) * 100000).toFixed(2)

// --------------------------------------------------------------------------------------------------------

    // (2.6) Create array with traces for plot

    let arrayForPlot = [];

    for(let i = 0; i < 5; i++) {
        let thisObj = {};
        thisObj.name = finalUniqueRaces[i];
        thisObj.type = 'bar';
        thisObj.x = finalUniqueAges;
        thisObj.y = mortalityRateArray[i];
        arrayForPlot.push(thisObj);
    }

    // --------------------------------------------------------------------------------------------------------

    // (2.7) Set up plot layout

    let layout = {
        barmode: 'group',
        title: 'COVID-19 Mortality Rate (per 100,000 population) in the United States: <span><br></span>Deaths to\t' + endWeeks[0].slice(0,10),
        xaxis: {
            title: 'Age Group',
        },
        yaxis: {
            title: {
                text: 'Mortality Rate (per 100,000)',
                standoff: 10
            }
        },
        showlegend: true,
        hoverlabel: {namelength: -1} // ensures that text outside tooltip box is not cut off
    }
        
    // --------------------------------------------------------------------------------------------------------

    // (2.8) Plot

    Plotly.newPlot(
        'demographicsDiv', 
        {
            data: arrayForPlot, 
            layout: layout
        }
    )

})