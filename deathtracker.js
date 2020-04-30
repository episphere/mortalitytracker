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

dtrack.ui=async(div)=>{
    if(typeof(div)=='string'){
        div=document.getElementById(div)
    }
    //dtrack.data.states = (await (await fetch('https://data.cdc.gov/resource/muzy-jte6.json?$select=distinct%20jurisdiction_of_occurrence')).json()).map(x=>x.jurisdiction_of_occurrence)
    dtrack.data.all=await (await fetch('https://data.cdc.gov/resource/muzy-jte6.json?$limit=10000')).json()
    dtrack.data.all=dtrack.cleanData(dtrack.data.all)
    dtrack.data.states=[...new Set(dtrack.data.all.map(x=>x.jurisdiction_of_occurrence))]
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
    return dt.map(d=>{
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
        d.weekendingdate=Date(d.weekendingdate)
        return d
    })
}

dtrack.plotlyCompare=(div='plotlyCompareDiv')=>{
    if(typeof(div)=='string'){
        div=document.getElementById(div)
    }
    let stateData = dtrack.data.all.filter(x=>x.jurisdiction_of_occurrence==selectState.value)
    let data2020 = stateData.filter(x=>x.mmwryear==2020)
    let weeks = data2020.map(x=>parseInt(x.mmwrweek))
    let data2019 = stateData.filter(x=>(x.mmwryear==2019&x.mmwrweek<=weeks.reduce((a,b)=>Math.max(a,b))))
    let trace2019 = {
        x:weeks,
        y:data2019.map(x=>x[selectCause.value]),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2019'
    }
    let trace2020 = {
        x:weeks,
        y:data2020.map(x=>x[selectCause.value]),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2020'
    }
    Plotly.newPlot(div,[trace2019,trace2020],{
        title:`Comparing 2019 and 2020 death records in <b style="color:green">${selectState.value}</b> by<br><b style="color:maroon">${dtrack.data.causes[selectCause.value]}</b>`,
        xaxis: {
            title: 'deaths'
        },
        yaxis: {
            title: 'Week'
        },
    })
    //div.innerHTML=Date()
}

