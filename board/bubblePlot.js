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
let unweightedData = data.filter(data => data.type == "Unweighted");
let finalFilteredData = unweightedData.filter(data => data.outcome == "All causes")

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
        traces.push({
            x: [0, 6000],
            y: [0, 6000],
            mode: 'lines',
            line: {
                color: 'gray'
            },
            name: 'Reference line'
        })

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
                title: 'Expected Number of Deaths',
            },
            yaxis: {
                title: {
                text: 'Observed Number of Deaths',
                standoff: 10
                }
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
                    color: '#666'}
                },
                steps: sliderSteps,
                legend: {
                    bordercolor: 'gray',
                    borderwidth: 2,
                    traceorder:'reversed'
                }
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

    coffee(finalFilteredData);

})