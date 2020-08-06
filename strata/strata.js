console.log('strata.js loaded')

// checking dependencies

strata={
    data:{}
}

strata.getData=async()=>{
    let url='https://data.cdc.gov/resource/mwk9-wnfr.json'
    // get sex race and age data
    let xx = await d3.json(url)
    strata.data.stratParms=["sex", "race_ethnicity", "age_group"]
    strata.data.numParms=[ "year", "mmwrweek", "allcause", "naturalcause", "septicemia_a40_a41", "malignant_neoplasms_c00_c97", "diabetes_mellitus_e10_e14", "alzheimer_disease_g30", "influenza_and_pneumonia_j09", "chronic_lower_respiratory", "other_diseases_of_respiratory", "nephritis_nephrotic_syndrome", "symptoms_signs_and_abnormal", "diseases_of_heart_i00_i09", "cerebrovascular_diseases", "covid_19_u071_multiple_cause", "covid_19_u071_underlying"]
    strata.data.dateParms=["data_as_of", "analysis_period_start_date", "analysis_period_end_date",]

    xx = xx.map(x=>{
        strata.data.numParms.forEach(k=>{
            x[k]=parseInt(x[k])
        })
        strata.data.dateParms.forEach(k=>{
            x[k]=new Date(x[k])
        })
        return x
    })
    strata.data.stratValues={}
    strata.data.dt=xx
    console.log(`${strata.data.dt.length}x${Object.keys(strata.data.dt[0]).length} mwk9-wnfr dataset loaded`)
    strata.data.stratParms.forEach(p=>{
        strata.data.stratValues[p]=[... new Set(strata.data.dt.map(x=>x[p]))]
        if(p=='age_group'){
            strata.data.stratValues[p]=strata.data.stratValues[p].sort((a,b)=>{
                //console.log(parseInt(a.match(/^([^\s\-]+).*/)[1]),parseInt(b.match(/^([^\s\-]+).*/)[1]))
                if(parseInt(a.match(/^([^\s\-]+).*/)[1])>parseInt(b.match(/^([^\s\-]+).*/)[1])){
                    return 1
                }else{
                    return -1
                }
        })}
    })
    return xx
}

strata.selectCounts=(div0=document.getElementById("countTabDiv"))=>{
    //let h='<input id="maleRadio" type="radio" value="Male" checked=true> Male<input id="femaleRadio" type="radio" value="Female" checked=true> Female'
    let h=''
    Object.keys(strata.data.stratValues).forEach(k=>{
        h+=`<b style="color:maroon">${k}:</b>`
        strata.data.stratValues[k].forEach(v=>{
            h+=`<br><input id="${v}Radio" type="checkbox" value='{"${k}":"${v}"}' checked=true onchange="strata.filterSelected()"> ${v}`
        })
        h+='<br>'
    })
    h+='<div id=tabCountDiv></div>'
    div0.innerHTML=h
    strata.div0=div0
    return div0
}

strata.filterSelected=()=>{
    // filter
    console.log('----begin----')
    strata.filters={}
    let filters = [...strata.div0.querySelectorAll('input')].filter(ip=>(!ip.checked)).forEach(ip=>{
        console.log(ip.value)
        let fi = JSON.parse(ip.value)
        let k=Object.keys(fi)[0]
        if(!strata.filters[k]){
            strata.filters[k]=[]
        }
        strata.filters[k].push(fi[k])
    })
    console.log('----end----')
    strata.data.filtered=strata.data.dt.filter(x=>{ // filters
        let res=true
        Object.keys(strata.filters).forEach(k=>{
            strata.filters[k].forEach(v=>{
                if(x[k]==v){
                    res=false
                }
            })  
        })
        return res
    })
    console.log(strata.filters,strata.data.filtered)
}

strata.ini=async()=>{
    await strata.getData()
    strata.selectCounts()
    strata.filterSelected()
}

if(typeof(define)!='undefined'){
    define(strata)
}

strata.ini()
