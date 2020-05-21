const datasetURL = "https://data.cdc.gov/resource/xkkf-xrst"
const format = "json"
const defaultLimit = 1000
const excess = {}
excess.data = {}

const keyMaps = {
  observed_number: "observed_number",
  average_expected_count: "average_expected_count",
  upper_bound_threshold: "upper_bound_threshold",
  week_ending_date: "week_ending_date",
  state: "state",
  type: "type",
  outcome: "outcome",
  year: "year"
}

const fetchDataset = async (url) => {
  url = url ||  `${datasetURL}.${format}`
  let data = []
  let currentOffset = 0
  while (true) {
    const resp = await fetch(`${datasetURL}?$limit=${defaultLimit}&$offset=${currentOffset}`)
    const respJSON = await resp.json()
    if (respJSON && respJSON.length > 0) {
      data = data.concat(respJSON)
    }
    if (respJSON.length < defaultLimit) {
      break
    }
    currentOffset += defaultLimit
  }
  return data
}

const loadHashParams = (selectElementId = "selectState") => {
  if (window.location.hash.length > 2) {
    excess.extParams = excess.extParams || {}
    window.location.hash.slice(1).split('&').forEach(hashParam => {
      const [param, value] = hashParam.split("=")
      excess.extParams[param] = decodeURIComponent(value)
    })
    
    if (excess.extParams.state && excess.params.states.indexOf(excess.extParams.state) !== -1) {
      document.getElementById(selectElementId).value = excess.extParams.state
    } else {
      excess.extParams.state=encodeURIComponent("United States")
    }
  }
}

excess.cleanData = (data = {...excess.data.raw}) => {

  const types = [ ...new Set(data.map(row => row[keyMaps.type])) ]
  const outcomes = [ ...new Set(data.map(row => row[keyMaps.outcome])) ]
  const states = [ ...new Set(data.map(row => row[keyMaps.state])) ]
  // const weeks2018 = [ ...new Set(data.filter(d => d.year == "2018").map(d => d.week_ending_date))] //Used for referencing weekends for all years to conform with how it is in deathtracker.js
  const years = [ ...new Set(data.map(row => parseInt(new Date(row[keyMaps.week_ending_date]).getUTCFullYear())).sort((a,b) => a - b))]

  // Move United States to top of states so that it is the default option in the select list.
  const unitedStatesIndex = states.indexOf("United States")
  states.splice(unitedStatesIndex, 1)
  states.unshift("United States")

  // Use the array indices as the concept IDs for now.
  // outcomes.forEach((outcome, ind) => excess.concepts.outcomes[outcome] = ind )
  // states.forEach((state, ind) => excess.concepts.states[state] = ind )
  // types.forEach((type, ind) => excess.concepts.types[type] = ind )

  let dataWithMMWRWeek = []  
  years.forEach(year => {
    const yearlyData = data.filter(row => parseInt(new Date(row[keyMaps.week_ending_date]).getUTCFullYear()) === year)
    const weeksInYear = [ ...new Set(yearlyData.map(row => row[keyMaps.week_ending_date])) ]
    const yearlyDataTillCurrentWeek = yearlyData.filter(row => {
      const rowWeekendDate = new Date(row[keyMaps.week_ending_date])
      const currentDate = new Date()
      // Only use weeks for all years till ongoing week in current year.
      if (rowWeekendDate.getMonth() < currentDate.getMonth() || (rowWeekendDate.getMonth() === currentDate.getMonth() && rowWeekendDate.getDate() <= currentDate.getDate())) {
        row.mmwrWeek = year === 2017 ? weeksInYear.indexOf(row[keyMaps.week_ending_date]) + 2 : weeksInYear.indexOf(row[keyMaps.week_ending_date]) + 1 // Data for 2017 starts from Jan 14, so starting MMWR week from 2 for that year to make it consistent.
        row.mmwrYear = rowWeekendDate.getUTCFullYear() // First few weeks in 2018 data have the year field set to other years for some reason :/ Rectifying that
        return row
      }
    })
    dataWithMMWRWeek = dataWithMMWRWeek.concat(yearlyDataTillCurrentWeek)
  })
  
  return { dataWithMMWRWeek, states, years, types, outcomes }
}

excess.ui = async (divId) => {
  excess.data.raw = await fetchDataset()
  const { dataWithMMWRWeek, ...params } = excess.cleanData(excess.data.raw.map(row => ({...row}) )) // Cloning the original object
  excess.data.cleanedData = dataWithMMWRWeek
  excess.params = params


  // const selectTypeRadioBtn = (value) => {
  //   typeSelectDiv.querySelectorAll("input.excessDeathsBarChartType").forEach(el => {
  //     if (el.value !== value) {
  //       el.removeAttribute("checked")
  //     } else if (!el.getAttribute("checked")) {
  //       el.setAttribute("checked", "true")
  //       excess.renderPlots(plotsParentDivId)
  //     }
  //   })
  // }

  // const typeSelectWeightedDiv = document.createElement("div")
  // const typeSelectWeightedBtn = document.createElement("input")
  // typeSelectWeightedBtn.setAttribute("type", "radio")
  // typeSelectWeightedBtn.setAttribute("name", "type")
  // typeSelectWeightedBtn.setAttribute("class", "excessDeathsBarChartType")
  // typeSelectWeightedBtn.setAttribute("id", "barChartOptionWeighted")
  // typeSelectWeightedBtn.setAttribute("value", "Predicted (weighted)")
  // typeSelectWeightedBtn.setAttribute("checked", "true")
  // typeSelectWeightedBtn.onclick = () => selectTypeRadioBtn(typeSelectWeightedBtn.value)
  // const typeSelectWeightedLabel = document.createElement("label")
  // typeSelectWeightedLabel.setAttribute("for", "barChartOptionWeighted")
  // typeSelectWeightedLabel.innerText = "Predicted (weighted)"
  // typeSelectWeightedLabel.style.marginLeft = "5px"
  // typeSelectWeightedDiv.appendChild(typeSelectWeightedBtn)
  // typeSelectWeightedDiv.appendChild(typeSelectWeightedLabel)
  
  // const typeSelectUnweightedDiv = document.createElement("div")
  // const typeSelectUnweightedBtn = document.createElement("input")
  // typeSelectUnweightedBtn.setAttribute("type", "radio")
  // typeSelectUnweightedBtn.setAttribute("name", "type")
  // typeSelectUnweightedBtn.setAttribute("class", "excessDeathsBarChartType")
  // typeSelectUnweightedBtn.setAttribute("id", "barChartOptionUnweighted")
  // typeSelectUnweightedBtn.setAttribute("value", "Unweighted")
  // typeSelectUnweightedBtn.onclick = () => selectTypeRadioBtn(typeSelectUnweightedBtn.value)
  // const typeSelectUnweightedLabel = document.createElement("label")
  // typeSelectUnweightedLabel.setAttribute("for", "barChartOptionUnweighted")
  // typeSelectUnweightedLabel.innerText = "Unweighted"
  // typeSelectUnweightedLabel.style.marginLeft = "5px"
  // typeSelectUnweightedDiv.appendChild(typeSelectUnweightedBtn)
  // typeSelectUnweightedDiv.appendChild(typeSelectUnweightedLabel)
  
  // typeSelectDiv.appendChild(typeSelectWeightedDiv)
  // typeSelectDiv.appendChild(typeSelectUnweightedDiv)

  const parentDiv = document.getElementById(divId)
  const plotDivId = "plotlyCompareDiv"
  let h = `<hr> Excess deaths Associated With COVID-19 in 2017-19 and 2020 for \
  <select id="selectState" onchange="excess.renderPlots('${plotDivId}');"></select>\
  by type <select id="selectType" onchange="excess.renderPlots('${plotDivId}')"></select><br/>\
  [CDC sources <a href=${datasetURL} target="_blank">Excess Deaths</a>]<br>`
  h += `<div id="${plotDivId}"></div><br>`
  parentDiv.innerHTML = h
  
  const selectState = document.getElementById("selectState")
  excess.params.states.forEach(state => {
    const stateOption = document.createElement("option")
    stateOption.setAttribute("value",state)
    stateOption.innerText = state
    selectState.appendChild(stateOption)
  })

  const selectType = document.getElementById("selectType")
  excess.params.types.forEach(type => {
    const typeOption = document.createElement("option")
    typeOption.setAttribute("value", type)
    typeOption.innerText = type
    selectType.appendChild(typeOption)
  })


  loadHashParams()
  excess.renderPlots(plotDivId)
}

// const selectTypeRadioBtn = (value, plotsParentDivId="plotlyCompareDiv") => {
//   document.querySelectorAll(".dataTypeRadioBtn").forEach(el => {
//     if (el.value != value) {
//       el.removeAttribute("checked")
//     }
//     else {
//       el.setAttribute("checked", "true")
//     }
//   })
//   excess.renderPlots(plotsParentDivId)
// }

excess.renderPlots = (plotsParentDivId="plotlyCompareDiv") => {
  excess.areaPlot(plotsParentDivId)
  excess.areaPlotCumulative(plotsParentDivId)
  // excess.scatterPlot(plotsParentDivId)
  excess.barChart(plotsParentDivId)
}

excess.areaPlot = (plotsParentDivId="plotlyCompareDiv") => {
  const plotsParentDiv = document.getElementById(plotsParentDivId)
  const areaPlotDivId = "excessDeathsareaPlot"
  let areaPlotDiv = document.getElementById(areaPlotDivId)
  if (!areaPlotDiv) {
    areaPlotDiv = document.createElement("div")
    areaPlotDiv.setAttribute("id", areaPlotDivId)
    areaPlotDiv.style.width = "100%"
    plotsParentDiv.appendChild(areaPlotDiv)
    plotsParentDiv.appendChild(document.createElement("hr"))
    plotsParentDiv.appendChild(document.createElement("br"))
  }

  const compareWith = document.getElementById("areaPlotCompareWithSelect") ? document.getElementById("areaPlotCompareWithSelect").value : keyMaps.average_expected_count
  const { cleanedData: dataToPlot } = excess.data
  
  excess.stateSelected = document.getElementById('selectState').value
  excess.typeSelected = document.getElementById('selectType').value
  window.location.hash=`type=${encodeURIComponent(excess.typeSelected)}&state=${encodeURIComponent(excess.stateSelected)}`

  excess.data.stateSelected = dataToPlot.filter(row => row[keyMaps.state] === excess.stateSelected && row[keyMaps.type] === excess.typeSelected)
  excess.params.mmwrWeeks = [ ...new Set(excess.data.stateSelected.map(row => row.mmwrWeek)) ].sort((a, b) => a-b)
  excess.params.maxMMWRWeek = excess.params.mmwrWeeks[excess.params.mmwrWeeks.length - 1]
  const weeks2020 = excess.data.stateSelected.filter(row => row.mmwrYear === 2020 && row[keyMaps.outcome] === "All causes").map(row => new Date(row[keyMaps.week_ending_date]))

  const dataFor2020 = excess.data.stateSelected.filter(row => (row.mmwrYear === 2020 && row.mmwrWeek <= excess.params.maxMMWRWeek && row[keyMaps.observed_number] !== undefined && row[keyMaps.upper_bound_threshold] !== undefined))
  const dataForOtherYears = excess.data.stateSelected.filter(row => (row.mmwrYear !== 2020 && row.mmwrWeek <= excess.params.maxMMWRWeek && row[keyMaps.observed_number] !== undefined && row[keyMaps.upper_bound_threshold] !== undefined && row[keyMaps.outcome] === "All causes" ))
  const avgOutcomeSpecificDataPerWeek = excess.params.mmwrWeeks.map(week => {
    const outcomeDataPerYear = dataForOtherYears.filter(row => row.mmwrWeek === week)
    return outcomeDataPerYear.reduce((prev, current) =>  prev + (current[keyMaps.observed_number] - current[compareWith]), 0)/outcomeDataPerYear.length
  })
  
  excessDeathsFor2020 = {}
  excess.params.outcomes.forEach(outcome => {
    excessDeathsFor2020[outcome] = []
    const outcomeSpecificData = dataFor2020.filter(row => row[keyMaps.outcome] === outcome)
    const averageExcessForOutcome = outcomeSpecificData.reduce((prev, current) => prev + (current[keyMaps.observed_number] - current[compareWith]), 0) / outcomeSpecificData.length
    const acceptableDeviation = averageExcessForOutcome < 0 ? averageExcessForOutcome * 2.5 : averageExcessForOutcome * -2.5
    
    outcomeSpecificData.forEach(row => {
      const excessDeaths = row[keyMaps.observed_number] - row[compareWith]
      if (!isNaN(excessDeaths)) {
        if (row.mmwrWeek >= excess.params.maxMMWRWeek - 2 && excessDeaths < acceptableDeviation) {
          // Completely arbitrary condition check to handle when last couple of weeks' data (couple of weeks is also an arbitrarily chosen time period)
          // is just too weird (varies from the mean too much), for instance when counting has not completed for a week the excess for this observatioin 
          // is just too less compared to the average excess.
        } else {
          excessDeathsFor2020[outcome].push(excessDeaths)
        }
      }
    })
  })
  
  const upperBoundThresholdsFor2020 = dataFor2020.filter(row => row[keyMaps.outcome] === excess.params.outcomes[0]).map(row => row[keyMaps.upper_bound_threshold])
  // const outcomeNamesMap = {
  //   "All causes": "Including COVID-19",
  //   "All causes, excluding COVID-19": "Excluding COVID-19"
  // }
  const areaPlotTraces = excess.params.outcomes.map(outcome => {
    const x = weeks2020
    const y = excessDeathsFor2020[outcome]
    const fill = outcome === "All causes" ? "tonexty" : "tozeroy"
    const fillcolor = outcome === "All causes" ? "#f54242" : undefined
    const line = {
      color: outcome === "All causes" ? "#f54242" : undefined
    }
    
    return {
      x,
      y,
      fill,
      fillcolor,
      type: "scatter",
      hovertemplate: "%{y}",
      name: "Excess Deaths from "+ outcome +" for 2020",
      line,
      mode: "markers",
      marker: {
        size: 2
      }
    }
  }).reverse()
  // console.log(areaPlotTraces)

  // const thresholdTrace = {
  //   x: weeks2020,
  //   y: avgOutcomeSpecificDataPerWeek,
  //   type: "scatter",
  //   mode: "lines+markers",
  //   name: "Average Excess from 2017-2019",
  //   line: {
  //     dash: "solid",
  //     width: 2
  //   },
  //   marker: {
  //     color: "royalblue"
  //   }
  // }
  
  const averageOverOtherYearsTrace = {
    x: weeks2020,
    y: avgOutcomeSpecificDataPerWeek,
    fill: "tozeroy",
    fiilcolor: "blueviolet",
    type: "scatter",
    hovertemplate: "%{y}",
    name: "Average Excess Deaths from 2017-2019",
    line: {
      color: "blueviolet"
    },
    mode: "markers",
    marker: {
      size: 2
    }
  }
  
  // areaPlotTraces.push(thresholdTrace)
  areaPlotTraces.push(averageOverOtherYearsTrace)

  const layout = {
    title: `Excess Mortality in <b style="color:green">${excess.stateSelected}</b> as <b>${excess.typeSelected}</b> vs. the <b style="color:maroon">${compareWith}</b>`,
    legend: { 'orientation': "h" },
    yaxis: {
      'range': [-Math.abs(Math.min(...Object.values(excessDeathsFor2020).flat())*2.5), Math.abs(Math.max(...Object.values(excessDeathsFor2020).flat())*1.25)]
    }
  }
  Plotly.newPlot(areaPlotDivId, areaPlotTraces, layout, {responsive: true});

  if (!document.getElementById("areaPlotCompareWithSelect")) {
    const compareWithSelectDiv = document.createElement("div")
    compareWithSelectDiv.innerHTML = `Compare With:\
    <select id="areaPlotCompareWithSelect" onchange="excess.areaPlot('${plotsParentDivId}')">\
      <option value="${keyMaps.average_expected_count}">Average Expected Count</option>
      <option value="${keyMaps.upper_bound_threshold}">Upper Bound Threshold</option>
    </select>
    `
    areaPlotDiv.insertBefore(compareWithSelectDiv, areaPlotDiv.firstElementChild)
  }

}

excess.areaPlotCumulative = (plotsParentDivId="plotlyCompareDiv") => {
  const plotsParentDiv = document.getElementById(plotsParentDivId)
  const areaPlotCumulativeDivId = "excessDeathsareaPlotCumulative"
  let areaPlotCumulativeDiv = document.getElementById(areaPlotCumulativeDivId)
  if (!areaPlotCumulativeDiv) {
    areaPlotCumulativeDiv = document.createElement("div")
    areaPlotCumulativeDiv.setAttribute("id", areaPlotCumulativeDivId)
    areaPlotCumulativeDiv.style.width = "100%"
    plotsParentDiv.appendChild(areaPlotCumulativeDiv)
    plotsParentDiv.appendChild(document.createElement("hr"))
    plotsParentDiv.appendChild(document.createElement("br"))
  }

  const compareWith = keyMaps.average_expected_count
  const { cleanedData: dataToPlot } = excess.data
  
  excess.stateSelected = document.getElementById('selectState').value || excess.extParams.state
  excess.typeSelected = document.getElementById('selectType').value || excess.extParams.type

  excess.data.stateSelected = dataToPlot.filter(row => row[keyMaps.state] === excess.stateSelected && row[keyMaps.type] === excess.typeSelected)
  excess.params.mmwrWeeks = [ ...new Set(excess.data.stateSelected.map(row => row.mmwrWeek)) ].sort((a, b) => a-b)
  excess.params.maxMMWRWeek = excess.params.mmwrWeeks[excess.params.mmwrWeeks.length - 1]
  const weeks2020 = excess.data.stateSelected.filter(row => row.mmwrYear === 2020 && row[keyMaps.outcome] === "All causes").map(row => new Date(row[keyMaps.week_ending_date]))

  const dataFor2020 = excess.data.stateSelected.filter(row => (row.mmwrYear === 2020 && row.mmwrWeek <= excess.params.maxMMWRWeek && row[keyMaps.observed_number] !== undefined && row[keyMaps.upper_bound_threshold] !== undefined))
  const dataForOtherYears = excess.data.stateSelected.filter(row => (row.mmwrYear !== 2020 && row.mmwrWeek <= excess.params.maxMMWRWeek && row[keyMaps.observed_number] !== undefined && row[keyMaps.upper_bound_threshold] !== undefined && row[keyMaps.outcome] === "All causes" ))
  let cumulativeSumForOtherYears = 0
  const cumulativeDeathsForOtherYears = excess.params.mmwrWeeks.map(week => {
    const deathsPerWeek = dataForOtherYears.filter(row => row.mmwrWeek === week)
    cumulativeSumForOtherYears += deathsPerWeek.reduce((prev, current) =>  prev + parseInt(current[keyMaps.observed_number]), 0)/deathsPerWeek.length
    return cumulativeSumForOtherYears
  })
  
  cumulativeDeathsFor2020 = {}
  excess.params.outcomes.forEach(outcome => {
    cumulativeDeathsFor2020[outcome] = []
    const outcomeSpecificData = dataFor2020.filter(row => row[keyMaps.outcome] === outcome)
    // const averageExcessForOutcome = outcomeSpecificData.reduce((prev, current) => prev + (current[keyMaps.observed_number] - current[compareWith]), 0) / outcomeSpecificData.length
    // const acceptableDeviation = averageExcessForOutcome < 0 ? averageExcessForOutcome * 2.5 : averageExcessForOutcome * -2.5
    let cumulativeSum = 0
    outcomeSpecificData.forEach(row => {
      cumulativeSum += parseInt(row[keyMaps.observed_number])
      if (!isNaN(cumulativeSum)) {
        cumulativeDeathsFor2020[outcome].push(cumulativeSum)
      }
    })
  })
  
  // const upperBoundThresholdsFor2020 = dataFor2020.filter(row => row[keyMaps.outcome] === excess.params.outcomes[0]).map(row => row[keyMaps.upper_bound_threshold])
  // const outcomeNamesMap = {
  //   "All causes": "Including COVID-19",
  //   "All causes, excluding COVID-19": "Excluding COVID-19"
  // }
  const areaPlotTraces = excess.params.outcomes.map(outcome => {
    console.log(cumulativeDeathsFor2020[outcome])
    const x = weeks2020.slice(8)
    const y = cumulativeDeathsFor2020[outcome].slice(8)
    const fill = outcome === "All causes" ? "tonexty" : "tozeroy"
    const fillcolor = outcome === "All causes" ? "#f54242" : undefined
    const line = {
      color: outcome === "All causes" ? "#f54242" : undefined
    }
    
    return {
      x,
      y,
      fill,
      fillcolor,
      type: "scatter",
      hovertemplate: "%{y}",
      name: "Cumulative Deaths from "+ outcome +" for 2020",
      line,
      mode: "markers",
      marker: {
        size: 2
      }
    }
  }).reverse()

  // const thresholdTrace = {
  //   x: weeks2020,
  //   y: avgOutcomeSpecificDataPerWeek,
  //   type: "scatter",
  //   mode: "lines+markers",
  //   name: "Average Excess from 2017-2019",
  //   line: {
  //     dash: "solid",
  //     width: 2
  //   },
  //   marker: {
  //     color: "royalblue"
  //   }
  // }
  
  const averageOverOtherYearsTrace = {
    x: weeks2020.slice(8),
    y: cumulativeDeathsForOtherYears.slice(8),
    fill: "tozeroy",
    fiilcolor: "blueviolet",
    type: "scatter",
    hovertemplate: "%{y}",
    name: "Average Cumulative Deaths from 2017-2019",
    line: {
      color: "blueviolet"
    },
    mode: "markers",
    marker: {
      size: 2
    }
  }
  
  // areaPlotTraces.push(thresholdTrace)
  areaPlotTraces.push(averageOverOtherYearsTrace)

  const layout = {
    title: `Cumulative Deaths in <b style="color:green">${excess.stateSelected}</b> as <b>${excess.typeSelected}</b> for 2020 vs. 2017-2019`,
    legend: { 'orientation': "h" }
  }
  Plotly.newPlot(areaPlotCumulativeDivId, areaPlotTraces, layout, {responsive: true});

  if (!document.getElementById("areaPlotCompareWithSelect")) {
    const compareWithSelectDiv = document.createElement("div")
    compareWithSelectDiv.innerHTML = `Compare With:\
    <select id="areaPlotCompareWithSelect" onchange="excess.areaPlot('${plotsParentDivId}')">\
      <option value="${keyMaps.average_expected_count}">Average Expected Count</option>
      <option value="${keyMaps.upper_bound_threshold}">Upper Bound Threshold</option>
    </select>
    `
    areaPlotDiv.insertBefore(compareWithSelectDiv, areaPlotDiv.firstElementChild)
  }

}


excess.scatterPlot = (plotsParentDivId="plotlyCompareDiv") => {
  const plotsParentDiv = document.getElementById(plotsParentDivId)
  const { cleanedData: dataToPlot } = excess.data

  // excess.outcomeSelected = document.getElementById('selectOutcome').value
  excess.stateSelected = document.getElementById('selectState').value
  window.location.hash=`outcome=${encodeURIComponent(excess.outcomeSelected)}&state=${encodeURIComponent(excess.stateSelected)}`

  excess.data.stateSelected = dataToPlot.filter(row => row.state === excess.stateSelected && row.outcome === excess.outcomeSelected)
  excess.params.maxMMWRWeek = excess.data.stateSelected.reduce((prev, current) => prev < current.mmwrWeek ? current.mmwrWeek : prev, 0)
  const weeks2020 = [...new Set(excess.data.stateSelected.filter(row => row.mmwrYear === 2020 && row.type==="Predicted (weighted)").map(row => new Date(row.week_ending_date)))]

  const getScatterTrace = (year, type="Predicted (weighted)") => {
    const dataForYear = excess.data.stateSelected.filter(row => (row.mmwrYear === year && row.mmwrWeek <= excess.params.maxMMWRWeek && row.observed_number && row.upper_bound_threshold && row.type === type))

    const marker = {}
    marker.size = year === 2020 ? 8 : 4
    if (type === "Unweighted") {
      marker.color = "royalblue"
    } else {
      marker.color = year === 2020 ?  'maroon' : undefined
    }
    const lineWidth = year === 2020 ? 3 : 1
    
    const x = year === 2017 ? weeks2020.slice(1) : weeks2020
    const meanDifference =  dataForYear.reduce((prev, current) => prev + (current.observed_number - current.upper_bound_threshold), 0)/dataForYear.length || 0
    const y = dataForYear.map(row => {
      const acceptableDeviation = meanDifference < 0 ? meanDifference * 2.5 : meanDifference * -2.5

      if (row.mmwrWeek >= excess.params.maxMMWRWeek - 2 && row.observed_number - row.upper_bound_threshold < acceptableDeviation) {
        
        return undefined
      } else if (!isNaN(row.observed_number - row.upper_bound_threshold)) {
        return row.observed_number - row.upper_bound_threshold
      } else {
        return undefined
      }
    })
    const trace = {
      x,
      y,
      type: 'scatter',
      mode: 'lines+markers',
      name: year === 2020 ? `${year} ${type}` : year,
      line: {
        width: lineWidth
      },
      marker
    }
  }
  
  const scatterTrace = excess.params.years.map(year => getScatterTrace(year, "Predicted (weighted)"))
  scatterTrace.push(getScatterTrace(2020, "Unweighted"))
  
  const scatterPlotDivId = "excessDeathsScatterPlot"
  let scatterPlotDiv = document.getElementById(scatterPlotDivId)
  if (!scatterPlotDiv) {
    scatterPlotDiv = document.createElement("div")
    scatterPlotDiv.setAttribute("id", scatterPlotDivId)
    plotsParentDiv.appendChild(scatterPlotDiv)
    plotsParentDiv.appendChild(document.createElement("hr"))
    plotsParentDiv.appendChild(document.createElement("br"))
  }

  Plotly.newPlot(scatterPlotDivId, scatterTrace,{
    title:`Comparing 2020 with 2017-2019 excessive deaths in <b style="color:green">${excess.stateSelected}</b> for <br><b style="color:maroon">${excess.outcomeSelected}</b></b>`,
    xaxis: {
      title: 'Date of calendar day in 2020'
    },
    yaxis: {
      title: 'Excess Deaths per week'
    },
    legend:{
      bordercolor: 'gray',
      borderwidth: 2
    }
  }, {responsive: true})
}

excess.barChart = (plotsParentDivId = "plotlyCompareDiv") => {
  const plotsParentDiv = document.getElementById(plotsParentDivId)
  let optionsDiv = document.getElementById("barChartOptions")

  if (!optionsDiv) {
    optionsDiv = document.createElement("div")
    optionsDiv.setAttribute("id", "barChartOptions")
    optionsDiv.style.width = "100%"
    optionsDiv.style.textAlign = "center"

    const outcomeSelectDiv = document.createElement("div")
    const outcomeSelect = document.createElement("select")
    outcomeSelect.setAttribute("id", "excessDeathsBarChartOutcome") 
    excess.params.outcomes.forEach(outcome => {
      const outcomeOption = document.createElement("option")
      outcomeOption.setAttribute("value", outcome)
      outcomeOption.innerText = outcome
      outcomeSelect.appendChild(outcomeOption)
    })
    outcomeSelectDiv.appendChild(outcomeSelect)

    const typeSelectDiv = document.createElement("div")
    typeSelectDiv.setAttribute("id", "excessDeathsBarChartTypes")
    typeSelectDiv.style.width = "55%"
    typeSelectDiv.style.margin = "0 auto"
    typeSelectDiv.style.display = "flex"
    typeSelectDiv.style.justifyContent = "space-around"
    
    const yearSelect = document.createElement("select")
    yearSelect.setAttribute("id", "excessDeathsBarChartYear")
    yearSelect.innerHTML = excess.params.years.map(year => {
      if (year === 2020) {
        return `<option value=${year} selected>${year}</option>`
      }
      return `<option value=${year}>${year}</option>`
    }).join("")
    yearSelect.onchange = () => {
      if (parseInt(yearSelect.value) !== 2020) {
        typeSelectDiv.style.visibility = "hidden"
      } else {
        typeSelectDiv.style.visibility = "visible"
      }
      // excess.barChart(plotsParentDivId)
    }
    yearSelect.style.width = "30%"
    
    optionsDiv.appendChild(yearSelect)
    optionsDiv.appendChild(document.createElement("br"))
    optionsDiv.appendChild(typeSelectDiv)
    optionsDiv.appendChild(document.createElement("br"))
    plotsParentDiv.appendChild(optionsDiv)
  } 
  
  const yearSelected = parseInt(document.getElementById("excessDeathsBarChartYear").value) || excess.params.years[0]

  const barChartDivId = "excessDeathsBarChart"
  let barChartDiv = document.getElementById(barChartDivId)
  if (!barChartDiv){
    barChartDiv = document.createElement("div")
    barChartDiv.setAttribute("id", barChartDivId)
    plotsParentDiv.appendChild(barChartDiv)
  }

  const namesMap = {
    "upper_bound_threshold": "Deaths Threshold",
    "observed_number": "Observed Number of Deaths"
  }
  const getBarChartTrace = (field) => {
    const dataForYear = excess.data.stateSelected.filter(row => (row.mmwrYear === yearSelected && row.mmwrWeek <= excess.params.maxMMWRWeek && row.type === excess.typeSelected))
    const x = dataForYear.map(row => new Date(row.week_ending_date))
    const y = dataForYear.map(row => {
      if (row[field]) {
        return row[field]
      } else {
        return undefined
      }
    })
    const trace = {
      x,
      y,
      text: y.map(Number),
      textposition: 'auto',
      hovertemplate: '%{y}',
      name: namesMap[field],
      type: 'bar'
    };
    return trace
  }

  const thresholdBarTraces = getBarChartTrace("upper_bound_threshold")
  const observedNumberBarTraces = getBarChartTrace("observed_number")

  const dataForBarChart = [thresholdBarTraces, observedNumberBarTraces]
  const maxYAxisValue = Math.max(...excess.data.stateSelected.map(row => row.upper_bound_threshold), ...excess.data.stateSelected.map(row => row.observed_number))
  const orderOfMagnitudeOfMaxValue = 10 ** (Math.floor(Math.log10(maxYAxisValue)))
  const maxYAxisRangeValue = orderOfMagnitudeOfMaxValue * Math.floor(maxYAxisValue/orderOfMagnitudeOfMaxValue + 1)

  const layout = { 
    title:`Comparing Thresholds To Observed Deaths during the year <b>${yearSelected}</b> in <b style="color:green">${excess.stateSelected}</b> for <br><b style="color:maroon">${excess.outcomeSelected}</b></b>`,
    barmode: 'group', 
    legend: {"orientation": "h"},
    yaxis: {
      "range": [0, maxYAxisRangeValue]
    }
  }

  Plotly.newPlot(barChartDivId, dataForBarChart, layout, {responsive: true})
}