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

let data = JSON.parse(url)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// FILTER CDC DATA
let prelimFinalFilteredData = data.filter(data => data.outcome == "All causes")
let finalFilteredData = prelimFinalFilteredData.filter(data => data.type == "Unweighted");

let markerData = data.filter(data => data.outcome == "All causes, excluding COVID-19") // Predicted (weighted)

const cdcStateData = []
for (let i = 0; i < finalFilteredData.length; i++) {
    cdcStateData.push(finalFilteredData[i].state)
}

function getUniqueValues(value, index, self) { 
    return self.indexOf(value) === index;
}
let cdcUniqueStates = cdcStateData.filter(getUniqueValues);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CONVERTING JHU POPULATION DATA FROM CSV TO JSON AND PREPROCESSING

let allJHUdata = [];
let mappedPops = [];
let scaledPops = [];

d3.csv('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv').then(function(data) {
    
    for(let i = 0; i < data.length; i++) 
    allJHUdata.push(data[i])

    let JHUdata_filteredProps = []
    for(let i = 0; i < allJHUdata.length; i++)
        JHUdata_filteredProps.push( (({Province_State, Population}) => ({Province_State, Population}))(allJHUdata[i]) );

    const JHUstates = []
    for (var i = 0; i < JHUdata_filteredProps.length; i++) 
    JHUstates.push(JHUdata_filteredProps[i].Province_State)

    let JHUsortedStates = JHUstates.sort()

    let JHUuniqueStates = [JHUsortedStates[0]];
    for(let i = 1; i < JHUsortedStates.length; i++) 
        if(JHUsortedStates[i - 1] !== JHUsortedStates[i]) 
            JHUuniqueStates.push(JHUsortedStates[i])

    let summedPops = [];
    summedPops.length = JHUuniqueStates.length;
    // initialize array with zeros
    summedPops.fill(0);
    // fill array with actual population values
    for(let i = 0; i < JHUuniqueStates.length; i++) 
        for(let j = 0; j < JHUdata_filteredProps.length; j++) 
            if(JHUdata_filteredProps[j].Province_State == JHUuniqueStates[i]) 
                    summedPops[i] += parseInt(JHUdata_filteredProps[j].Population);

    let JHUuniqueStates_and_summedPops_asArray = [];
    for(let i = 0; i < JHUuniqueStates.length; i++) {
        JHUuniqueStates_and_summedPops_asArray.push([]);
        JHUuniqueStates_and_summedPops_asArray[i].push(JHUuniqueStates[i]);
        JHUuniqueStates_and_summedPops_asArray[i].push(summedPops[i]);
    }

    let JHUuniqueStates_and_summedPops_asJSON = Object.fromEntries(JHUuniqueStates_and_summedPops_asArray);

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


    coffee(finalFilteredData);
    renderMap(finalFilteredData);
})


function coffee(data) {

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
                    size:  (Math.log(scaledPops[i])) * 10, // data.marker.size.slice()  controls size of first week              
                    sizemode: 'area',
                    sizeref: 0, // !!!!!!!!!!!!!!!!!!!
                    opacity: 0.8,
                    visible: true // whether or not the trace is visible
                }
            });
        } else {
            traces.push({
                name: state_s[i], // appears as the legend item and on hover
                x: data.x.slice(),
                y: data.y.slice(),
                hovertemplate: '<b>State:</b>\t' + state_s[i] +
                            '<br><br> Expected deaths:\t %{x}' +
                            '<br> Observed deaths:\t %{y}' + 
                            '<br> Population:\t' + mappedPops[i],
                mode: 'markers', // want markers in legend
                marker: {
                    size:  (Math.log(scaledPops[i])) * 10, // data.marker.size.slice()  controls size of first week              
                    sizemode: 'area',
                    sizeref: 0, // !!!!!!!!!!!!!!!!!!!
                    opacity: 0.8,
                },
                visible: 'legendonly'
            });

        }
    }
    // traces.push({
    //     x: [0, 6000],
    //     y: [0, 6000],
    //     mode: 'lines',
    //     line: {
    //         color: 'gray'
    //     },
    //     name: 'Reference line'
    // })

    //////////////////////////////////////////////////////////////////////////////////

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

    //////////////////////////////////////////////////////////////////////////////////

    let sliderSteps = [];

    for (let i = week_ending_date_s.indexOf("2020-01-04"); i < week_ending_date_s.length; i++) {
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

    //////////////////////////////////////////////////////////////////////////////////
    let layout = {
        title: 'Observed Deaths vs. Expected Deaths for All Causes of Death',
        xaxis: {
            title: 'Expected Number of Deaths'
        },
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

    //////////////////////////////////////////////////////////////////////////////////

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

let selectedState = [];
let selectedPointNumbers = [];

const renderMap = (cdcData) => {
    Plotly.d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/2014_usa_states.csv', function(err, rows) {
  
    function unpack(rows, key) {
        return rows.map(function(row) { return row[key]; });
    }
    let data = [{
        type: 'choropleth',
        locationmode: 'USA-states',
        locations: unpack(rows, 'Postal'),
        z: unpack(rows, 'Population'),
        text: unpack(rows, 'State')
    }];

    let layout = {
        title: '2014 US Population by State',
        
        geo: {
            scope: 'usa',
            countrycolor: 'rgb(255, 255, 255)',
            showland: true,
            landcolor: 'rgb(217, 217, 217)',
            showlakes: true,
            lakecolor: 'rgb(255, 255, 255)',
            subunitcolor: 'rgb(255, 255, 255)',
            lonaxis: {},
            lataxis: {}
        },	       
        dragmode: false
    };

    const labelDiv = document.createElement('div');
    labelDiv.innerHTML = '';
    labelDiv.id = 'mapLabel';
    labelDiv.style.minHeight = '70px'

    const mapDiv = document.createElement('div');
    mapDiv.id = 'plotlyMap';

    document.getElementById('choroplethDiv').innerHTML = '';
    document.getElementById('choroplethDiv').appendChild(labelDiv)
    document.getElementById('choroplethDiv').appendChild(mapDiv)

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
                    template += `<button class="remove-state" title="Remove this selection" data-state="${s}" style="border-radius: 0.5rem;border: 0px;margin: 2px;">${s} &times;</button>`
                })
                if(selectedState.length !== 0 ) template += ` </br></br><button title="Remove all selection" style="border-radius: 0.5rem;border: 0px;margin: 2px;color:#ff0000" id="clearStateSelection">Clear all selection</button>`;
                document.getElementById('mapLabel').innerHTML = template;
                const clearAll = document.getElementById('clearStateSelection');
                if(clearAll){
                    clearAll.addEventListener('click', () => {
                        document.getElementById('mapLabel').innerHTML = '';
                        selectedState = [];
                        coffee(filterData(cdcData, selectedState));
                    })
                }

                const removeStates = document.getElementsByClassName('remove-state');
                Array.from(removeStates).forEach(btn => {
                    btn.addEventListener('click', () => {
                        const s = btn.dataset.state;
                        selectedState.splice(selectedState.indexOf(s), 1);
                        btn.parentNode.removeChild(btn);
                        coffee(filterData(cdcData, selectedState));
                    })
                });

                d.points[0].data.selectedpoints = selectedPointNumbers
                Plotly.redraw('plotlyMap');
                coffee(filterData(cdcData, selectedState));
            })
        });
    
    });
}

const filterData = (cdcData, selectedState) => {
    let newData;
    if(selectedState.length === 0 ) newData = cdcData;
    else newData = cdcData.filter(dt => selectedState.indexOf(dt.state) !== -1);
    return newData;
}