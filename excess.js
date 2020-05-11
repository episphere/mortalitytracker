const datasetURL = "https://data.cdc.gov/resource/xkkf-xrst"
const format = "json"
const defaultLimit = 1000
const excess = {}
excess.data = {}

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

excess.cleanData = (data = excess.data.raw) => {

  const types = [ ...new Set(data.map(row => row.type)) ]
  const outcomes = [ ...new Set(data.map(row => row.outcome)) ]
  const states = [ ...new Set(data.map(row => row.state)) ]
  // const weeks2018 = [ ...new Set(data.filter(d => d.year == "2018").map(d => d.week_ending_date))] //Used for referencing weekends for all years to conform with how it is in deathtracker.js
  const years = [ ...new Set(data.map(row => parseInt(new Date(row.week_ending_date).getUTCFullYear())).sort((a,b) => a - b))]

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
    const yearlyData = data.filter(row => row.year == `${year}`)
    const weeksInYear = [ ...new Set(yearlyData.map(row => row.week_ending_date)) ]
    const yearlyDataTillCurrentWeek = yearlyData.filter(row => {
      const rowWeekendDate = new Date(row.week_ending_date)
      const currentDate = new Date()
      // Only use weeks for all years till ongoing week in current year.
      if (rowWeekendDate.getMonth() < currentDate.getMonth() || (rowWeekendDate.getMonth() === currentDate.getMonth() && rowWeekendDate.getDate() <= currentDate.getDate())) {
        row.mmwrWeek = year === 2017 ? weeksInYear.indexOf(row.week_ending_date) + 2 : weeksInYear.indexOf(row.week_ending_date) + 1 // Data for 2017 starts from Jan 14, so adding an extra MMWR week to make it consistent.
        // row.week_ending_date_mapped = weeks2018[row.mmwrWeek - 1]
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
  const { dataWithMMWRWeek, ...params } = excess.cleanData(excess.data.raw)
  excess.data.cleanedData = dataWithMMWRWeek
  excess.params = params

  const parentDiv = document.getElementById(divId)
  const plotDivId = "plotlyCompareDiv"
  let h = `<hr> Excess deaths Associated With COVID-19 by <select id="selectOutcome" onchange="excess.plotlyCompare()"></select>\
  in 2017-19 and 2020 for <select id="selectState" onchange="excess.plotlyCompare();"></select><br/>\
  [CDC sources <a href=${datasetURL} target="_blank">Excess Deaths</a>]<br>`
  h += '<div id="typeSelect" style="width:100%; text-align:center;">'
  h+= excess.params.types.map((type)=> {
    return `<input type='radio' class='dataTypeRadioBtn' id="${type}" name='dataType' value="${type}" style="margin-left: 7rem;" onclick="selectTypeRadioBtn('${type}')">\
    <label for"${type}" style="margin-right: 7rem;">${type}</label>`
  }).join("")
  h += '</div>'
  h += `<div id=${plotDivId}></div><br>`
  parentDiv.innerHTML = h
  document.getElementsByClassName("dataTypeRadioBtn")[0].setAttribute("checked", "")
  
  const selectOutcome = document.getElementById("selectOutcome")
  excess.params.outcomes.forEach(outcome => {
    const outcomeOption = document.createElement("option")
    outcomeOption.setAttribute("value", outcome)
    outcomeOption.innerText = outcome
    selectOutcome.appendChild(outcomeOption)
  })
  
  const selectState = document.getElementById("selectState")
  excess.params.states.forEach(state => {
    const stateOption = document.createElement("option")
    stateOption.setAttribute("value",state)
    stateOption.innerText = state
    selectState.appendChild(stateOption)
  })

  loadHashParams()
  excess.scatterPlot(plotDivId)
  excess.barChart(plotDivId)
}

const selectTypeRadioBtn = (value) => {
  document.querySelectorAll(".dataTypeRadioBtn").forEach(el => {
    if (el.value != value) {
      el.removeAttribute("checked")
    }
    else {
      el.setAttribute("checked", "true")
    }
  })
  excess.scatterPlot()
  excess.barChart()
}

excess.scatterPlot = (plotsParentDivId="plotlyCompareDiv") => {
  const plotsParentDiv = document.getElementById(plotsParentDivId)
  const { cleanedData: dataToPlot } = excess.data

  excess.outcomeSelected = document.getElementById('selectOutcome').value
  excess.stateSelected = document.getElementById('selectState').value
  excess.typeSelected = document.querySelector(".dataTypeRadioBtn[checked]").value
  window.location.hash=`outcome=${encodeURIComponent(excess.outcomeSelected)}&state=${encodeURIComponent(excess.stateSelected)}&type=${encodeURIComponent(excess.typeSelected)}`

  excess.data.stateSelected = dataToPlot.filter(row => row.state === excess.stateSelected && row.outcome === excess.outcomeSelected && row.type === excess.typeSelected)
  excess.params.maxMMWRWeek = excess.data.stateSelected.reduce((prev, current) => prev < current.mmwrWeek ? current.mmwrWeek : prev, 0)
  const weeks2020 = excess.data.stateSelected.filter(row => row.mmwrYear === 2020).map(row => new Date(row.week_ending_date))

  const getScatterTrace = (year) => {
    const dataForYear = excess.data.stateSelected.filter(row => (row.mmwrYear === year && row.mmwrWeek <= excess.params.maxMMWRWeek && row.observed_number && row.threshold))
    
    const marker = {}
    marker.size = year === 2020 ? 8 : 4
    marker.color = year === 2020 ? 'maroon' : undefined
    const lineWidth = year === 2020 ? 3 : 1
    
    const x = year === 2017 ? weeks2020.slice(1) : weeks2020
    const meanDifference =  dataForYear.reduce((prev, current) => prev + (current.observed_number - current.threshold), 0)/dataForYear.length || 0
    const y = dataForYear.map(row => {
      const acceptableDeviation = meanDifference < 0 ? meanDifference * 4 : meanDifference * -4
      if (row.mmwrWeek >= excess.params.maxMMWRWeek - 2 && row.observed_number - row.threshold < acceptableDeviation) {
        // Completely arbitrary condition check to handle when last couple of weeks' data (couple of weeks is also an arbitrarily chosen time period)
        // is just too weird (varies from the mean too much), for instance when week counting has not completed the threshold is greater than the observed_number by an absurdly large difference.
        return undefined
      } else if (!isNaN(row.observed_number - row.threshold)) {
        return row.observed_number - row.threshold
      } else {
        return undefined
      }
    })

    const trace = {
      x,
      y,
      type: 'scatter',
      mode: 'lines+markers',
      name: year,
      line: {
        width: lineWidth
      },
      marker
    }
    return trace
  }
  
  const scatterTrace = excess.params.years.map(year => getScatterTrace(year))
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
  let yearSelect = plotsParentDiv.querySelector("select#excessDeathsBarChartYear")
  if (!yearSelect){
    yearSelect = document.createElement("select")
    yearSelect.setAttribute("id", "excessDeathsBarChartYear")
    yearSelect.innerHTML = excess.params.years.map(year => {
      if (year === 2020) {
        return `<option value=${year} selected>${year}</option>`
      }
      return `<option value=${year}>${year}</option>`
    }).join("")
    yearSelect.onchange = () => excess.barChart()
    yearSelect.style.width = "30%"
    yearSelect.style.marginLeft = "35%"
    plotsParentDiv.appendChild(yearSelect)
    plotsParentDiv.appendChild(document.createElement("br"))
  } 
  let yearSelected = parseInt(yearSelect.value) || excess.params.years[0]

  const barChartDivId = "excessDeathsBarChart"
  let barChartDiv = document.getElementById(barChartDivId)
  if (!barChartDiv){
    barChartDiv = document.createElement("div")
    barChartDiv.setAttribute("id", barChartDivId)
    plotsParentDiv.appendChild(barChartDiv)
  }

  const namesMap = {
    "threshold": "Deaths Threshold",
    "observed_number": "Observed Number of Deaths"
  }
  const getBarChartTrace = (field) => {
    const dataForYear = excess.data.stateSelected.filter(row => (row.mmwrYear === yearSelected && row.mmwrWeek <= excess.params.maxMMWRWeek))
    const x = excess.data.stateSelected.filter(row => row.mmwrYear === yearSelected).map(row => new Date(row.week_ending_date))
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

  const thresholdBarTraces = getBarChartTrace("threshold")
  const observedNumberBarTraces = getBarChartTrace("observed_number")

  const dataForBarChart = [thresholdBarTraces, observedNumberBarTraces]
  const layout = { 
    title:`Comparing Thresholds To Observed Deaths during the year <b>${yearSelected}</b> in <b style="color:green">${excess.stateSelected}</b> for <br><b style="color:maroon">${excess.outcomeSelected}</b></b>`,
    barmode: 'group', 
    legend: {"orientation": "h"} 
  }

  Plotly.newPlot(barChartDivId, dataForBarChart, layout, {responsive: true})
}