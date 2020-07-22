// GET ALL CDC EXCESS DEATHS DATA

function getData(url) {
    let response = '';
    let xhr = new XMLHttpRequest(); // creating an XMLHTTPRequest
    if(xhr != null) {
        xhr.open('GET', url, false); // configuring the request
        xhr.send(null); // sending the request to the server
        response = xhr.responseText;
    }
    return response;
}
let url = getData('https://data.cdc.gov/resource/xkkf-xrst?$limit=1000000')
const data = JSON.parse(url)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// FILTER CDC DATA

const data_allCauses_prelim = data.filter(data => data.outcome == "All causes")
const data_allCauses = data_allCauses_prelim.filter(data => data.type == "Unweighted");
// let data_exceptCOVID = data.filter(data => data.outcome == "All causes, excluding COVID-19") // Predicted (weighted)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// GET UNIQUE STATES

const cdcStateData = []
for (let i = 0; i < data_allCauses.length; i++) cdcStateData.push(data_allCauses[i].state)
function getUniqueValues(value, index, self) { 
    return self.indexOf(value) === index;
}
const cdcUniqueStates = cdcStateData.filter(getUniqueValues);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// PREPROCESS JHU POPULATION DATA & INTEGRATE BUBBLE PLOT AND CHOROPLETH

// Declare global variables
let mappedPops = [];
let scaledPops = [];
let selectedState = [];
let selectedPointNumbers = [];

(function insertPopulationsIntoPlots() {

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

        let summedPops = [];
        summedPops.length = JHUuniqueStates.length;
        summedPops.fill(0);
        for(let i = 0; i < JHUuniqueStates.length; i++) 
            for(let j = 0; j < allJHUdata.length; j++) 
                if(allJHUdata[j].Province_State == JHUuniqueStates[i]) 
                        summedPops[i] += parseInt(allJHUdata[j].Population);

        let JHUuniqueStates_and_summedPops_asArray = [];
        for(let i = 0; i < JHUuniqueStates.length; i++) {
            JHUuniqueStates_and_summedPops_asArray.push([]);
            JHUuniqueStates_and_summedPops_asArray[i].push(JHUuniqueStates[i]);
            JHUuniqueStates_and_summedPops_asArray[i].push(summedPops[i]);
        }

        // let JHUuniqueStates_and_summedPops_asJSON = Object.fromEntries(JHUuniqueStates_and_summedPops_asArray);

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

        let usPop = 0;
        usPop += mappedPops.reduce((a, b) => a + b, 0)
        
        mappedPops[mappedPops.lastIndexOf(0)] = usPop;

        // obtained from: https://www.google.com/publicdata/explore?ds=kf7tgg1uo9ude_&met_y=population&idim=place:3651000&hl=en&dl=en
        mappedPops[mappedPops.indexOf(0)] = 8399000;

        scaledPops = mappedPops.map(x => Math.round(x/100000))


        renderBubblePlot(data_allCauses);
        renderMap(data_allCauses);
    })
})()

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CREATE BUBBLE PLOT

function renderBubblePlot(data) {
    let lookup = {};
    function getData(week_ending_date, state) {
        let byWeek, trace;
        if (!(byWeek = lookup[week_ending_date])) {
            byWeek = lookup[week_ending_date] = {};
        }
        if (!(trace = byWeek[state])) {
            trace = byWeek[state] = {
                x: [],
                y: [],
                id: [],
                text: [],
                mode: 'markers' // want markers on plot
            };
        }
        return trace;
    }
    for (let i = 0; i < data.length; i++) {
        let datum = data[i];
        let trace = getData(datum.week_ending_date, datum.state);
        trace.x.push(datum.average_expected_count);
        trace.y.push(datum.observed_number);
        trace.id.push(datum.state);
    }
    let week_ending_date_s = Object.keys(lookup); // an array of all week ending dates
    let firstWeek = lookup[week_ending_date_s[week_ending_date_s.indexOf("2020-01-04")]];
    let state_s = Object.keys(firstWeek); // an array of all states
    let traces = [];
    for (let i = 0; i < state_s.length; i++) {
        let data = firstWeek[state_s[i]];
        if(state_s[i] != "United States"){
            traces.push({
                name: state_s[i], // appears as the legend item and on hover
                x: data.x,
                y: data.y,
                hovertemplate: '<b>State:</b>\t' + state_s[i] +
                               '<br><br> Expected deaths:\t %{x}' +
                               '<br> Observed deaths:\t %{y}' + 
                               '<br> Population:\t' + mappedPops[i],
                mode: 'markers', // want markers in legend
                marker: {
                    size:  (Math.log(scaledPops[i])) * 8, // data.marker.size.slice()  controls size of first week              
                    sizemode: 'area',
                    sizeref: 0, // !!!!!!!!!!!!!!!!!!!
                    opacity: 0.8,
                    visible: true // whether or not the trace is visible
                }
            });
        } else {
            traces.push({
                name: state_s[i], // appears as the legend item and on hover
                x: data.x,
                y: data.y,
                hovertemplate: '<b>State:</b>\t' + state_s[i] +
                               '<br><br> Expected deaths:\t %{x}' +
                               '<br> Observed deaths:\t %{y}' + 
                               '<br> Population:\t' + mappedPops[i],
                mode: 'markers', // want markers in legend
                marker: {
                    size:  (Math.log(scaledPops[i])) * 8, // data.marker.size.slice()  controls size of first week              
                    sizemode: 'area',
                    sizeref: 0, // !!!!!!!!!!!!!!!!!!!
                    opacity: 0.8,
                },
                visible: 'legendonly'
            });
        }
    }
    // Allows different frames of data for use when slider is moved
    let frames = [];
    for (let i = week_ending_date_s.indexOf("2020-01-04"); i < week_ending_date_s.length; i++) {
        frames.push({
            name: week_ending_date_s[i],
            data: state_s.map(function (state) {
                return getData(week_ending_date_s[i], state);
            })
        })
    }
    let sliderSteps = [];
    for(let i = week_ending_date_s.indexOf("2020-01-04"); i < week_ending_date_s.length; i++) {
        sliderSteps.push({
            method: 'animate',
            label: week_ending_date_s[i],
            args: [[week_ending_date_s[i]], {
                mode: 'immediate',
                transition: {duration: 300},
                frame: {duration: 300, redraw: false},
            }]
        });
    }
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
        hovermode: 'closest',
        sliders: [{
            pad: {l: 130, t: 100},
            currentvalue: {
                visible: true,
                prefix: 'Week Ending Date: ',
                xanchor: 'left',
                font: {
                    size: 15, 
                    color: '#666'
                }
            },
            steps: sliderSteps,
            legend: {
                bordercolor: 'gray',
                borderwidth: 2,
                traceorder:'reversed'
            }
        }],
        // for play/pause button
        updatemenus: [{
            x: 0,
            y: 0,
            yanchor: 'top',
            xanchor: 'left',
            showactive: false,
            direction: 'left',
            type: 'buttons',
            pad: {t: 87, r: 10},
            buttons: [{
              method: 'animate',
              args: [null, {
                mode: 'immediate',
                fromcurrent: true,
                transition: {duration: 300},
                frame: {duration: 500, redraw: false}
              }],
              label: 'Play'
            }, {
              method: 'animate',
              args: [[null], {
                mode: 'immediate',
                transition: {duration: 0},
                frame: {duration: 0, redraw: false}
              }],
              label: 'Pause'
            }]
          }]
    };
    Plotly.newPlot(
        'bubblePlotDiv', 
        {
            data: traces,
            frames: frames,
            layout: layout
        }, 
        {responsive: true}
    );
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CREATE CHOROPLETH MAP

function renderMap(cdcData) {
    Plotly.d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/2014_usa_states.csv', function(err, rows) {
        function unpack(rows, key) { return rows.map(function(row) { return row[key]; }); }
        let data = [{
            type: 'choropleth',
            locationmode: 'USA-states',
            locations: unpack(rows, 'Postal'),
            // z: ratioArr,
            z: [5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0,
                5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0,
                5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0,
                5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0,
                5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0,
                5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0,
                5000.0, 5000.0, 5000.0, 5000.0, 5000.0, 5000.0],
            text: unpack(rows, 'State'),
            showscale: false   
        }];
        let layout = {
            geo: { scope: 'usa' },         
            dragmode: true,
            margin: {
                l: 30,
                r: 30,
                b: 100,
                t: 100,
                pad: 4
              },
        };

        const selectStateDiv = document.createElement('div');
            selectStateDiv.innerHTML = 'Select State(s) of Interest';
            selectStateDiv.id = 'selectStateLabel';
        const mapDiv = document.createElement('div');
            mapDiv.id = 'plotlyMap';
        const labelDiv = document.createElement('div');
            labelDiv.innerHTML = '';
            labelDiv.id = 'mapLabel';
            labelDiv.style.minHeight = '100px'
        document.getElementById('choroplethDiv').innerHTML = '';
        document.getElementById('choroplethDiv').appendChild(selectStateDiv)
            document.getElementById('selectStateLabel').style.textAlign = 'center';
            document.getElementById('selectStateLabel').style.color = 'green';
            document.getElementById('selectStateLabel').style.fontWeight = 'bold';
        document.getElementById('choroplethDiv').appendChild(mapDiv)
        document.getElementById('choroplethDiv').appendChild(labelDiv)
        Plotly.newPlot("plotlyMap", data, layout, {showLink: false})
            .then(gd => {
                gd.on('plotly_click', d => {
                    const pn = d.points[0].pointNumber;
                    const state = d.points[0].text;
                    if(selectedState.indexOf(state) === -1) {
                        selectedState.push(state);
                        selectedPointNumbers.push(pn)
                    }
                    else {
                        selectedState.splice(selectedState.indexOf(state), 1);
                        selectedPointNumbers.splice(selectedPointNumbers.indexOf(pn), 1);
                    }
                    selectedState.sort();
                    let template = '';
                    selectedState.forEach((s, index) => {
                        if(index === 0) template += 'Selected state(s): '
                        template += `<button class="remove-state"; title="Remove this selection"; data-state="${s}"; style="border-radius: 0.5rem; border: 0px; margin: 2px; ">${s} &times;</button>`
                    })
                    if(selectedState.length !== 0 ) template += ` </br></br><button title="Remove all selection" style="border-radius: 0.5rem; border: 0px; margin: 2px; color:#ff0000" id="clearStateSelection">Clear all selection</button>`;
                    document.getElementById('mapLabel').innerHTML = template;
                    const clearAll = document.getElementById('clearStateSelection');
                    if(clearAll){
                        clearAll.addEventListener('click', () => {
                            document.getElementById('mapLabel').innerHTML = '';
                            selectedState = [];
                            selectedPointNumbers = [];
                            d.points[0].data.selectedpoints = undefined;
                            Plotly.redraw('plotlyMap');
                            renderBubblePlot(filterData(cdcData, selectedState));
                        })
                    }
                    const removeStates = document.getElementsByClassName('remove-state');
                    Array.from(removeStates).forEach(btn => {
                        btn.addEventListener('click', () => {
                            const s = btn.dataset.state;
                            const p = d.points[0].data.text.indexOf(s);
                            selectedState.splice(selectedState.indexOf(s), 1);
                            selectedPointNumbers.splice(selectedPointNumbers.indexOf(p), 1);
                            btn.parentNode.removeChild(btn);
                            if(selectedPointNumbers.length !== 0) d.points[0].data.selectedpoints = selectedPointNumbers
                            else d.points[0].data.selectedpoints = undefined;
                            Plotly.redraw('plotlyMap');
                            renderBubblePlot(filterData(cdcData, selectedState));
                        })
                    });
                    if(selectedPointNumbers.length !== 0) d.points[0].data.selectedpoints = selectedPointNumbers
                    else  d.points[0].data.selectedpoints = undefined;
                    Plotly.redraw('plotlyMap');
                    renderBubblePlot(filterData(cdcData, selectedState));
                })
            });
        
    });
}

function filterData(cdcData, selectedState) {
    let newData;
    if(selectedState.length === 0) newData = cdcData;
    else newData = cdcData.filter(dt => selectedState.indexOf(dt.state) !== -1);
    return newData;
}
