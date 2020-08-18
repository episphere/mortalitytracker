
// getAllData(url)
    // Retrieves CDC mortality data for "All Causes of Death"
    // Parameter:
        // url = Request API url
function getAllCDCdata(url) {
    let response = '';
    let xhr = new XMLHttpRequest(); // creating an XMLHTTPRequest
    if(xhr != null) {
        xhr.open('GET', url, false); // configuring the request
        xhr.send(null); // sending the request to the server
        response = xhr.responseText;
    }
    let data = JSON.parse(response)
    const data_allCauses_prelim = data.filter(data => data.outcome == "All causes")
    const data_allCauses = data_allCauses_prelim.filter(data => data.type == "Unweighted");
    getCDCuniqueStates(data_allCauses);
}
                
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

getAllCDCdata('https://data.cdc.gov/resource/xkkf-xrst?$limit=1000000')

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
// getCDCuniqueStates(CDCdata)
    // Retrieves all unique states from CDCdata
    // Parameter:
        // CDCdata = CDC data in JSON format
function getCDCuniqueStates(CDCdata) {
    const cdcStateData = []
    for (let i = 0; i < CDCdata.length; i++) cdcStateData.push(CDCdata[i].state)
    function getUniqueValues(value, index, self) { 
        return self.indexOf(value) === index;
    }
    const cdcUniqueStates = cdcStateData.filter(getUniqueValues);
    getScaledPops(CDCdata, cdcUniqueStates);
}
        
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// getScaledPops(CDCdata, CDCuniqueStates)
    // Retrieves all scaled population values for all unique states from CDC data
    // Parameters:
        // CDCdata
        // CDCuniqueStates

function getScaledPops(CDCdata, cdcUniqueStates) {

    let mappedPops = [];
    let scaledPops = [];

    d3.csv('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv').then(function(data) {
        
        let allJHUdata = [];
        for(let i = 0; i < data.length; i++) allJHUdata.push(data[i])

        // Get unique JHU states
        const JHUstates = []
        for(let i = 0; i < allJHUdata.length; i++) JHUstates.push(allJHUdata[i].Province_State)
        JHUstates.sort();
        let JHUuniqueStates = [JHUstates[0]];
        for(let i = 1; i < JHUstates.length; i++) 
            if(JHUstates[i - 1] !== JHUstates[i]) 
                JHUuniqueStates.push(JHUstates[i])

        // Get 1-D array of populations for each JHU unique state
        let summedPops = [];
        summedPops.length = JHUuniqueStates.length;
        summedPops.fill(0);
        for(let i = 0; i < JHUuniqueStates.length; i++) 
            for(let j = 0; j < allJHUdata.length; j++) 
                if(allJHUdata[j].Province_State == JHUuniqueStates[i]) 
                        summedPops[i] += parseInt(allJHUdata[j].Population);

        // Get 2-D array (length = # of unique states) with each element being an array of unique state and its corresponding population
        let JHUuniqueStates_and_summedPops_asArray = [];
        for(let i = 0; i < JHUuniqueStates.length; i++) {
            JHUuniqueStates_and_summedPops_asArray.push([]);
            JHUuniqueStates_and_summedPops_asArray[i].push(JHUuniqueStates[i]);
            JHUuniqueStates_and_summedPops_asArray[i].push(summedPops[i]);
        }

        // let JHUuniqueStates_and_summedPops_asJSON = Object.fromEntries(JHUuniqueStates_and_summedPops_asArray);

        // Get array of populations for JHU unique states that are also contained in list of CDC unique states
        let mappedStates = [];
        for(let i = 0; i < cdcUniqueStates.length; i++) {
            if(JHUuniqueStates.includes(cdcUniqueStates[i])) {
                mappedStates.push(JHUuniqueStates[JHUuniqueStates.indexOf(cdcUniqueStates[i])]);
                mappedPops.push(summedPops[JHUuniqueStates.indexOf(cdcUniqueStates[i])]);
            } else {
                mappedStates.push('NA')
                mappedPops.push(0);
            }
        }

        // Compute population of United States and append this population to array of populations
        let usPop = 0;
        usPop += mappedPops.reduce((a, b) => a + b, 0)
        mappedPops[mappedPops.lastIndexOf(0)] = usPop;

        // Get population for New York City and append this population to array of populations
            // obtained from: https://www.google.com/publicdata/explore?ds=kf7tgg1uo9ude_&met_y=population&idim=place:3651000&hl=en&dl=en
        mappedPops[mappedPops.indexOf(0)] = 8399000;

        // Compute scaled population values
        scaledPops = mappedPops.map(x => Math.round(x/100000))

        getBubblePlotTrace(CDCdata, mappedPops, scaledPops)
        getChoroplethTrace(CDCdata, mappedPops, scaledPops);

    })

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getBubblePlotTrace(CDCdata, mappedPops, scaledPops) {

    // a lookup table organized by week ending date
    let bubbleLookup = {};

    // append data to lookup table
    for (let i = 0; i < CDCdata.length; i++) {
        let trace = setUpBubbleLookup(CDCdata[i].week_ending_date, CDCdata[i].state); // create an empty trace
        trace.x.push(CDCdata[i].average_expected_count);
        trace.y.push(CDCdata[i].observed_number);
    }    

    // initialize template for new trace (i.e., the lookup table)
    function setUpBubbleLookup(week_ending_date, state) {
        let byWeek, trace;
        if (!(byWeek = bubbleLookup[week_ending_date])) { // initially, this IS false ... enter brackets
            byWeek = bubbleLookup[week_ending_date] = {};
        }
        if (!(trace = byWeek[state])) {
            trace = byWeek[state] = {
                x: [],
                y: [],
                mode: 'markers' // want markers on plot
            };
        }
        return trace;
    }

    console.log('bubbleLookup', bubbleLookup)

    // create bubble plot trace
    let week_ending_date_s = Object.keys(bubbleLookup); // an array of all week ending dates
    let firstWeek = bubbleLookup[week_ending_date_s[week_ending_date_s.indexOf("2020-01-04")]];
    let state_s = Object.keys(firstWeek); // an array of all states
    let bubblePlotTrace = [];
    for (let i = 0; i < state_s.length; i++) {
        let CDCdata = firstWeek[state_s[i]];
        if(state_s[i] != "United States"){
            bubblePlotTrace.push({
                name: state_s[i], // appears as the legend item and on hover
                x: CDCdata.x,
                y: CDCdata.y,
                hovertemplate: '<b>State:</b>\t' + state_s[i] +
                                '<br><br> Expected deaths:\t %{x}' +
                                '<br> Observed deaths:\t %{y}' + 
                                '<br> Population:\t' + mappedPops[i],
                mode: 'markers', // want markers in legend
                marker: {
                    size:  (Math.log(scaledPops[i])) * 8, // controls size of first week              
                    sizemode: 'area',
                    sizeref: 0, // !!!!!!!!!!!!!!!!!!!
                    opacity: 0.8,
                    visible: true // whether or not the trace is visible
                }
            });
        } else {
            bubblePlotTrace.push({
                name: state_s[i], // appears as the legend item and on hover
                x: CDCdata.x,
                y: CDCdata.y,
                hovertemplate: '<b>State:</b>\t' + state_s[i] +
                               '<br><br> Expected deaths:\t %{x}' +
                               '<br> Observed deaths:\t %{y}' + 
                               '<br> Population:\t' + mappedPops[i],
                mode: 'markers', // want markers in legend
                marker: {
                    size:  (Math.log(scaledPops[i])) * 8, // controls size of first week              
                    sizemode: 'area',
                    sizeref: 0, // !!!!!!!!!!!!!!!!!!!
                    opacity: 0.8,
                },
                visible: 'legendonly'
            });
        }
    }
    console.log('bubblePlotTrace', bubblePlotTrace)
    getBubbleFrames(bubblePlotTrace, week_ending_date_s, state_s, setUpBubbleLookup, mappedPops, scaledPops);
    fillSliderOptions(week_ending_date_s, CDCdata);

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
let global_week_ending_date_s = [];

function fillSliderOptions(week_ending_date_s) {
    // set number of stops on slider
    let numberOfWeeks = week_ending_date_s.length - week_ending_date_s.indexOf("2020-01-04");
    document.getElementById("slider").step = 100 / numberOfWeeks;
    // set labels for ticks
    let slider = document.getElementById("steplist");
    for(let i = week_ending_date_s.indexOf("2020-01-04"); i < week_ending_date_s.length; i++) {
        global_week_ending_date_s.push(week_ending_date_s[i]);
    }
    for(let i = week_ending_date_s.indexOf("2020-01-04"); i < week_ending_date_s.length; i++) {
        let currentOption = document.createElement("option");
        currentOption.value = week_ending_date_s[i];
        currentOption.id = week_ending_date_s[i];
        slider.appendChild(currentOption)
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
function getBubbleFrames(bubblePlotTrace, week_ending_date_s, state_s, setUpBubbleLookup) {

    let frames = [];
    for (let i = week_ending_date_s.indexOf("2020-01-04"); i < week_ending_date_s.length; i++) {
        frames.push({
            name: week_ending_date_s[i],
            data: state_s.map(function (state) {
                return setUpBubbleLookup(week_ending_date_s[i], state);
            })
        })
    }
    console.log('bubbleFrames:', frames)
    getBubbleLayoutAndPlot(bubblePlotTrace, frames);

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
function getBubbleLayoutAndPlot(bubblePlotTrace, frames) {
    let layout = {
        // title: 'Observed Deaths vs. Expected Deaths for All Causes of Death',
        xaxis: { title: 'Expected Number of Deaths' },
        yaxis: {
            title: {
                text: 'Observed Number of Deaths',
                standoff: 10
            },
            range: [0, 8500]
        },
        height: 600,
        hovermode: 'closest'
    };
    Plotly.newPlot(
        'bubblePlotDiv', 
        {
            data: bubblePlotTrace,
            frames: frames,
            layout: layout
        }, 
        {responsive: true}
    );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getChoroplethTrace(CDCdata, mappedPops, scaledPops) {

    let mapStates;  
    let choroplethTrace = []; 

    Plotly.d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/2014_usa_states.csv', function(rows) {

        let lookup = {};

        // append data to lookup table
        for (let i = 0; i < global_week_ending_date_s.length; i++) {
            let trace = setUpChoroplethLookup(global_week_ending_date_s[i]);
            mapStates = unpack(rows, 'State');
            let observedNumbersForSingleWeek = [];        
            let expectedNumbersForSingleWeek = [];
            for(let j = 0; j < mapStates.length; j++)
                for(let k = 0; k < CDCdata.length; k++) 
                    if((CDCdata[k].week_ending_date == global_week_ending_date_s[i])  && (CDCdata[k].state === mapStates[j]))
                        if(CDCdata[k].observed_number != undefined && CDCdata[k].average_expected_count != undefined) {
                            observedNumbersForSingleWeek.push(parseInt(CDCdata[k].observed_number))
                            expectedNumbersForSingleWeek.push(parseInt(CDCdata[k].average_expected_count))
                        }
            for(let i = 0; i < observedNumbersForSingleWeek.length; i++) 
                trace.z.push(parseFloat((observedNumbersForSingleWeek[i] / expectedNumbersForSingleWeek[i]).toFixed(3)));      
        }

        console.log('choroplethLookup', lookup)

        function unpack(rows, key) { return rows.map(function(row) { return row[key]; }); }

        // initialize template for new trace (i.e., the lookup table)
        function setUpChoroplethLookup(week) {
            let byWeek, trace;
            if (!(byWeek = lookup[week])) // initially, this IS false ... enter brackets
                byWeek = lookup[week] = {};
            trace = lookup[week] = {
                type: 'choropleth',
                locationmode: 'USA-states',
                locations: unpack(rows, 'Postal'),
                text: unpack(rows, 'State'),
                showscale: true,
                z: []                   
            };
            return trace;
        }
    
        appendDataToChoroplethTrace("2020-01-04");

        // create choropleth map trace
        function appendDataToChoroplethTrace(firstWeek) {
            let week_ending_date_s = Object.keys(lookup); // an array of all week ending dates
            let firstWeekTrace = lookup[week_ending_date_s[week_ending_date_s.indexOf(firstWeek)]];
            console.log('firstWeek', firstWeek)
            choroplethTrace.push({
                type: 'choropleth',
                locationmode: 'USA-states',
                locations: unpack(rows, 'Postal'),
                text: unpack(rows, 'State'),
                showscale: true,
                z: firstWeekTrace.z
            });
        }

        getChoroplethFrames(choroplethTrace, setUpChoroplethLookup, mappedPops, scaledPops, CDCdata);

    });

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getChoroplethFrames(choroplethTrace, setUpChoroplethLookup, mappedPops, scaledPops, CDCdata) {

    Plotly.d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/2014_usa_states.csv', function(rows) {

        function unpack(rows, key) { return rows.map(function(row) { return row[key]; }); }

        function forFrames(week) {
            let trace = setUpChoroplethLookup(week);
            let mapStates = unpack(rows, 'State');
            let observedNumbersForSingleWeek = [];        
            let expectedNumbersForSingleWeek = [];
            for(let j = 0; j < mapStates.length; j++)
                for(let k = 0; k < CDCdata.length; k++) 
                    if((CDCdata[k].week_ending_date == week)  && (CDCdata[k].state === mapStates[j]))
                        if(CDCdata[k].observed_number != undefined && CDCdata[k].average_expected_count != undefined) {
                            observedNumbersForSingleWeek.push(parseInt(CDCdata[k].observed_number))
                            expectedNumbersForSingleWeek.push(parseInt(CDCdata[k].average_expected_count))
                        }
            for(let i = 0; i < observedNumbersForSingleWeek.length; i++) 
                trace.z.push(parseFloat((observedNumbersForSingleWeek[i] / expectedNumbersForSingleWeek[i]).toFixed(3)));  
            return trace;    
        }

        let choroplethFrames = [];
        for (let i = 0; i < global_week_ending_date_s.length; i++) {
            choroplethFrames.push({
                name: global_week_ending_date_s[i],
                data: forFrames(global_week_ending_date_s[i])
            })
        }
        console.log('choroplethFrames:', choroplethFrames)

        getChoroplethLayoutAndPlot(choroplethTrace, mappedPops, scaledPops, CDCdata);

    })

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
function getChoroplethLayoutAndPlot(choroplethTrace, mappedPops, scaledPops, CDCdata) {

    let selectedState = [];
    let selectedPointNumbers = []; 

    let layout = {
        title: "Observed/Expected Deaths by State",
        geo: { scope: 'usa' },         
        dragmode: true,
        margin: {
            l: 30,
            r: 30,
            b: 100,
            t: 100,
            pad: 4
        }
    };

    //  divs
    const labelDiv = document.createElement('div');
        labelDiv.innerHTML = '';
        labelDiv.id = 'mapLabel';
        labelDiv.style.minHeight = '100px'
    document.getElementById('choroplethDiv').appendChild(labelDiv)

    Plotly.newPlot("mapDiv", choroplethTrace, layout, {showLink: false}).then(gd => {

        gd.on('plotly_click', d => {

            const indexOfState = d.points[0].pointNumber; // index of the selected point
            const state = d.points[0].text; // state selected
            if(selectedState.indexOf(state) === -1) {
                selectedState.push(state);
                selectedPointNumbers.push(indexOfState)
            }
            else {
                selectedState.splice(selectedState.indexOf(state), 1);
                selectedPointNumbers.splice(selectedPointNumbers.indexOf(indexOfState), 1);
            }
            selectedState.sort();
            if(selectedPointNumbers.length !== 0)
                d.points[0].data.selectedpoints = selectedPointNumbers
            else
                d.points[0].data.selectedpoints = undefined;
            Plotly.redraw('mapDiv');
            getBubblePlotTrace(filterDataAfterClick(CDCdata, selectedState), mappedPops, scaledPops);

            // Functionality for labels in labelDiv:

            // let template = '';
            // selectedState.forEach((s, index) => {
            //     if(index === 0) 
            //         template += 'Selected state(s): '
            //     // template += `<button class="remove-state"; title="Remove this selection"; data-state="${s}"; style="border-radius: 0.5rem; border: 0px; margin: 2px; ">${s} &times;</button>`
            //     template += `<button data-state="${s}"; style="border-radius: 0.5rem; border: 0px; margin: 2px; ">${s}</button>`
            // })
            // if(selectedState.length !== 0 ) 
            //     template += ` </br></br><button title="Remove all selection" style="border-radius: 0.5rem; border: 0px; margin: 2px; color:#ff0000" id="clearStateSelection">Clear all selection</button>`;
            // document.getElementById('mapLabel').innerHTML = template;

            // const clearAll = document.getElementById('clearStateSelection');
            // if(clearAll) {
            //     clearAll.addEventListener('click', () => {
            //         document.getElementById('mapLabel').innerHTML = '';
            //         selectedState = [];
            //         selectedPointNumbers = [];
            //         d.points[0].data.selectedpoints = undefined;
            //         Plotly.redraw('mapDiv');
            //         getBubbleLayoutAndPlot(filterDataAfterClick(CDCdata, selectedState), mappedPops, scaledPops);
            //     })
            // }

            // const removeStates = document.getElementsByClassName('remove-state');
            // Array.from(removeStates).forEach(btn => {
            //     btn.addEventListener('click', () => {
            //         const s = btn.dataset.state;
            //         const p = d.points[0].data.text.indexOf(s);
            //         selectedState.splice(selectedState.indexOf(s), 1);
            //         selectedPointNumbers.splice(selectedPointNumbers.indexOf(p), 1);
            //         btn.parentNode.removeChild(btn);
            //         if(selectedPointNumbers.length !== 0) 
            //             d.points[0].data.selectedpoints = selectedPointNumbers;
            //         else 
            //             d.points[0].data.selectedpoints = undefined;
            //         Plotly.redraw('mapDiv');
            //         getBubbleLayoutAndPlot(filterDataAfterClick(CDCdata, selectedState), mappedPops, scaledPops);
            //     })
            // });

        })

    });

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function filterDataAfterClick(CDCdata, selectedState) {
    let newData;
    if(selectedState.length === 0) 
        newData = CDCdata;
    else 
        newData = CDCdata.filter(data => selectedState.indexOf(data.state) !== -1);
    console.log(newData)
    return newData;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function actionsAfterSlide(x) {

    // show value of selected week
    let indexOfSelectedWeek = Math.round(x * 0.3);
    let selectedWeek = global_week_ending_date_s[indexOfSelectedWeek] // ***********
    document.getElementById("slider_value").innerHTML = "Week of: " + selectedWeek;

    // get all CDC data
    function getAllCDCdata(url) {
        let response = '';
        let xhr = new XMLHttpRequest(); // creating an XMLHTTPRequest
        if(xhr != null) {
            xhr.open('GET', url, false); // configuring the request
            xhr.send(null); // sending the request to the server
            response = xhr.responseText;
        }
        let data = JSON.parse(response)
        const data_allCauses_prelim = data.filter(data => data.outcome == "All causes")
        const data_allCauses = data_allCauses_prelim.filter(data => data.type == "Unweighted");
        return data_allCauses
    }
    let CDCdata = getAllCDCdata('https://data.cdc.gov/resource/xkkf-xrst?$limit=1000000');

    // get selected traces for bubble plot and choropleth
    let selectedDataForBubbles = CDCdata.filter(data => data.week_ending_date === selectedWeek);

    let mapStates;
    let selectedDataForChoropleth = [];
    Plotly.d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/2014_usa_states.csv', function(rows) {
        function unpack(rows, key) { return rows.map(function(row) { return row[key]; }); }
        mapStates = unpack(rows, 'State');
        for(let i = 0; i < selectedDataForBubbles.length; i++) 
            if(mapStates.includes(selectedDataForBubbles[i].state))
            selectedDataForChoropleth.push(selectedDataForBubbles[i])
    })

    console.log('selectedDataForBubbles', selectedDataForBubbles)
    console.log('selectedDataForChoropleth', selectedDataForChoropleth)

    


}
