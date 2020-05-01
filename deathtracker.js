console.log('deathtracker.js loaded')

dtrack={data:{}}
dtrack.data.flags={
    flag_allcause: 'allcause',
    flag_alz: 'alzheimer_disease_g30',
    flag_clrd: 'chronic_lower_respiratory',
    flag_diab: 'diabetes_mellitus_e10_e14',
    flag_hd: 'diseases_of_heart_i00_i09',
    flag_inflpn: 'influenza_and_pneumonia_j10',
    flag_natcause: 'naturalcause',
    flag_neopl: 'malignant_neoplasms_c00_c97',
    flag_nephr: 'nephritis_nephrotic_syndrome',
    flag_otherresp: 'other_diseases_of_respiratory',
    flag_otherunk: 'symptoms_signs_and_abnormal',
    flag_sept: 'septicemia_a40_a41',
    flag_stroke: 'cerebrovascular_diseases'
}
dtrack.data.causes={
    allcause: 'All Cause',
    alzheimer_disease_g30: 'Alzheimer disease (G30)',
    cerebrovascular_diseases: 'Cerebrovascular diseases (I60-I69)',
    chronic_lower_respiratory: 'Chronic lower respiratory diseases (J40-J47)',
    diabetes_mellitus_e10_e14: 'Diabetes mellitus (E10-E14)',
    diseases_of_heart_i00_i09: 'Diseases of heart (I00-I09,I11,I13,I20-I51)',
    influenza_and_pneumonia_j10: 'Influenza and pneumonia (J10-J18)',
    //jurisdiction_of_occurrence: true,
    malignant_neoplasms_c00_c97: 'Malignant neoplasms (C00-C97)',
    //mmwrweek: true,
    //mmwryear: true,
    naturalcause: 'Natural Cause',
    nephritis_nephrotic_syndrome: 'Nephritis, nephrotic syndrome and nephrosis (N00-N07,N17-N19,N25-N27)',
    other_diseases_of_respiratory: 'Other diseases of respiratory system (J00-J06,J30-J39,J67,J70-J98)',
    septicemia_a40_a41: 'Septicemia (A40-A41)',
    symptoms_signs_and_abnormal: 'Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified (R00-R99)',
    //weekendingdate: true
}
dtrack.data.form={
    allcause: 0,
    alzheimer_disease_g30: 0,
    cerebrovascular_diseases: 0,
    chronic_lower_respiratory: 0,
    diabetes_mellitus_e10_e14: 0,
    diseases_of_heart_i00_i09: 0,
    influenza_and_pneumonia_j10: 0,
    //jurisdiction_of_occurrence: '',
    malignant_neoplasms_c00_c97: 0,
    //mmwrweek: 0,
    //mmwryear: 0,
    naturalcause: 0,
    nephritis_nephrotic_syndrome: 0,
    other_diseases_of_respiratory: 0,
    septicemia_a40_a41: 0,
    symptoms_signs_and_abnormal: 0,
    //weekendingdate: 0
}

dtrack.ui=async(div)=>{
    if(typeof(div)=='string'){
        div=document.getElementById(div)
    }
    //dtrack.data.states = (await (await fetch('https://data.cdc.gov/resource/muzy-jte6.json?$select=distinct%20jurisdiction_of_occurrence')).json()).map(x=>x.jurisdiction_of_occurrence)
    dtrack.data.all=await (await fetch('https://data.cdc.gov/resource/muzy-jte6.json?$limit=10000')).json()
    dtrack.data.all=dtrack.data.all.concat(await (await fetch('https://data.cdc.gov/resource/3yf8-kanr.json?$limit=10000')).json())
    dtrack.data.all=dtrack.data.all.concat(await (await fetch('https://data.cdc.gov/resource/3yf8-kanr.json?$limit=10000&$offset=10000')).json())
    dtrack.data.all=dtrack.cleanData(dtrack.data.all)
    dtrack.data.states=[...new Set(dtrack.data.all.map(x=>x.jurisdiction_of_occurrence))]
    // move All States from end to beginning
    dtrack.data.states.unshift(dtrack.data.states.slice(-1)[0]);dtrack.data.states.pop()
    let h='<hr>Comparing causes of death by <select id="selectCause" onchange="dtrack.plotlyCompare()"></select><br> in 2019 and 2020 for <select id="selectState" onchange="dtrack.plotlyCompare()"></select> [<a href="https://data.cdc.gov/resource/muzy-jte6" target="_blank">source</a>]'
    h+='<div id=plotlyCompareDiv></div>' 
    div.innerHTML=h
    dtrack.data.states.forEach(s=>{
        let opt=document.createElement('option')
        opt.value=opt.innerText=s
        selectState.appendChild(opt)
    })
    Object.keys(dtrack.data.causes).forEach(c=>{
        let opt=document.createElement('option')
        opt.value=c
        opt.innerText=dtrack.data.causes[c]
        selectCause.appendChild(opt)
    })
    dtrack.plotlyCompare()
}

dtrack.cleanData=(dt=dtrack.data.all)=>{
    // find all possible causes
    //let parms={} // get list of parameters in al entries
    dt = dt.map(d=>{
        let parms=Object.keys(d)
        parms.forEach(p=>{
            if(dtrack.data.flags[p]){
                d[dtrack.data.flags[p]]=NaN
            }
            if(dtrack.data.causes[p]){
                d[p]=parseInt(d[p])
            }
        })
        d.mmwrweek=parseInt(d.mmwrweek)
        d.mmwryear=parseInt(d.mmwryear)
        d.weekendingdate=new Date(d.weekendingdate)
        return d
    })
    // all states
    let allStates=[]
    let parmsNum = Object.keys(dtrack.data.form)
    dtrack.data.weeks=[... new Set(dtrack.data.all.filter(d=>d.mmwryear==2020).map(d=>d.mmwrweek))]
    dtrack.data.years=[... new Set(dtrack.data.all.map(d=>d.mmwryear))]
    //dtrack.data.weekends2018=[]
    //dtrack.data.weekends2019=[]
    //dtrack.data.weekends2020=[]
    dtrack.data.years.forEach(yr=>{
        let weekend='weekends'+yr
        dtrack.data[weekend]=[]    
        dtrack.data.weeks.forEach((wk,i)=>{
            dtrack.data[weekend][i]=dtrack.data.all.filter(d=>d.mmwrweek==wk&d.mmwryear==2018).map(d=>d.weekendingdate)[0]
            //dtrack.data.weekends2019[i]=dtrack.data.all.filter(d=>d.mmwrweek==wk&d.mmwryear==2019).map(d=>d.weekendingdate)[0]
            //dtrack.data.weekends2020[i]=dtrack.data.all.filter(d=>d.mmwrweek==wk&d.mmwryear==2020).map(d=>d.weekendingdate)[0]
        })
    })
        
    //yrs=[... new Set(dtrack.data.all.map(d=>d.mmwryear))]
    dtrack.data.years.forEach(yr=>{
        dtrack.data.weeks.forEach(wk=>{
            let dd = dtrack.data.all.filter(d=>(d.mmwryear==yr&d.mmwrweek==wk))
            let dSum={}
            Object.assign(dSum,dtrack.data.form)
            dd.forEach(d=>{
                parmsNum.forEach(p=>{
                    if(!isNaN(d[p])){
                        dSum[p]+=d[p]
                    }
                })
            })
            dSum.jurisdiction_of_occurrence='All States'
            dSum.mmwrweek=wk
            dSum.mmwryear=yr
            dt.push(dSum) // push at the beguinning of array
            //debugger
        })
    })
    return dt
}

dtrack.getCovid=async(url='https://data.cdc.gov/resource/pj7m-y5uh.json')=>{
    
}

dtrack.plotlyCompare=(div='plotlyCompareDiv')=>{
    if(typeof(div)=='string'){
        div=document.getElementById(div)
    }
    let stateData = dtrack.data.all.filter(x=>x.jurisdiction_of_occurrence==selectState.value)
    let traces = []
    let addTrace = yr=>{
        //let data = stateData.filter(x=>x.mmwryear==yr)
        let data=stateData.filter(x=>(x.mmwryear==yr&x.mmwrweek<=dtrack.data.weeks.slice(-1)[0]))
        let trace={
            x:dtrack.data['weekends'+yr].map(d=>{
                d.setYear(2020)
                return d
            }),
            y:data.map(x=>x[selectCause.value]),
            type: 'scatter',
            mode: 'lines+markers',
            name: yr,
            line: {
                width:1
            },
            marker:{
                size:4
            }
        }
        traces.push(trace)
    }
    dtrack.data.years.sort().slice(0,-1).forEach(yr=>{ // all years exept the last, 2020
        addTrace(yr)
    })

    let data2020 = stateData.filter(x=>x.mmwryear==2020)
    //let weeks = data2020.map(x=>parseInt(x.mmwrweek))
    let weeks = dtrack.data.weeks
    /*
    let data2018 = stateData.filter(x=>(x.mmwryear==2018&x.mmwrweek<=weeks.reduce((a,b)=>Math.max(a,b))))
    let trace2018 = {
        x:dtrack.data.weekends2018.map(d=>{
            d.setYear(2020)
            return d
            //debugger
        }), //weeks,
        y:data2018.map(x=>x[selectCause.value]),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2018'
    }
    let data2019 = stateData.filter(x=>(x.mmwryear==2019&x.mmwrweek<=weeks.reduce((a,b)=>Math.max(a,b))))
    let trace2019 = {
        x:dtrack.data.weekends2019.map(d=>{
            d.setYear(2020)
            return d
            //debugger
        }), //weeks,
        y:data2019.map(x=>x[selectCause.value]),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2019'
    }
    */
    let delay=dtrack.data.weekends2020.length-data2020.map(x=>x[selectCause.value]).length // different states / causes updating at different rates
    y2020=data2020.map(x=>x[selectCause.value]).slice(0,-3+delay) 
    //debugger
    let trace2020 = {
        x:dtrack.data.weekends2020.slice(0,-3+delay),  //weeks,
        y:data2020.map(x=>x[selectCause.value]).slice(0,-3+delay),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2020',
        marker: {
            color:'maroon',
            size:8
        },
        line:{
            width:3
        }
    }
    let trace2020temp = {
        x:dtrack.data.weekends2020.slice(-4,-1),  //weeks,
        y:data2020.map(x=>x[selectCause.value]).slice(-4+delay),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'counting <br>in progress',
        marker: {
            color:'silver',
            size:4,
        },
        line: {
            color:'silver',
            dash: 'dot'
            }
    }
    //Plotly.newPlot(div,[trace2018,trace2019,trace2020,trace2020temp],{
    Plotly.newPlot(div,traces.slice(1).concat([trace2020,trace2020temp]),{
        title:`Comparing 2020 with 2015-2019 death records in <b style="color:green">${selectState.value}</b> by<br><b style="color:maroon">${dtrack.data.causes[selectCause.value]}</b>`,
        xaxis: {
            title: 'Date of calendar day in 2020'
        },
        yaxis: {
            title: 'Deaths per week'
        },
    })
    //div.innerHTML=Date()
}

