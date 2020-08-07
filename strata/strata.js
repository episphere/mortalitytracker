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
    strata.data.dateParms=["data_as_of", "analysis_period_start_date", "analysis_period_end_date"]
    strata.data.causes=["allcause", "naturalcause", "septicemia_a40_a41", "malignant_neoplasms_c00_c97", "diabetes_mellitus_e10_e14", "alzheimer_disease_g30", "influenza_and_pneumonia_j09", "chronic_lower_respiratory", "other_diseases_of_respiratory", "nephritis_nephrotic_syndrome", "symptoms_signs_and_abnormal", "diseases_of_heart_i00_i09", "cerebrovascular_diseases", "covid_19_u071_multiple_cause", "covid_19_u071_underlying"]

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
    let h='<table><tr><td>'
    Object.keys(strata.data.stratValues).forEach(k=>{
        h+=`<b style="color:maroon">${k}:</b>`
        strata.data.stratValues[k].forEach(v=>{
            h+=`<br><input id="${v}Radio" class="strata" type="checkbox" value='{"${k}":"${v}"}' checked=true onchange="strata.filterSelected()"> ${v}`
        })
        h+='<br>'
    })
    h+='</td><td>'
    h+=`<b style="color:maroon">Causes:</b>`
    strata.data.causes.forEach(c=>{
        h+=`<br><input id="${c}Radio" class="cause" type="checkbox" value="${c}" checked=true onchange="strata.filterSelected()"> ${c}`
    })
    h += '</td></tr></table>'
    h+='<hr>'
    h+='<div id=tabulateDiv></div>'
    h+='<hr>'
    div0.innerHTML=h
    strata.div0=div0
    return div0
}

strata.filterSelected=()=>{
    // filter
    console.log('----begin----')
    strata.filters={}
    let filters = [...strata.div0.querySelectorAll('input')].filter(ip=>(!ip.checked)&(ip.className=='strata')).forEach(ip=>{
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
    strata.tabulate()
}

strata.tabulate=(div=document.getElementById('tabulateDiv'),dt=strata.data.filtered,parms=strata.data.causes)=>{ // tabulate filtered results
    div.innerHTML=`<p style="font-size:small">${Date()}, <a href="https://data.cdc.gov/NCHS/Cumulative-Provisional-Counts-of-Deaths-by-Sex-Rac/mwk9-wnfr" target="_blank">data #mwk9-wnfr</a>, Exclusion filters: ${JSON.stringify(strata.filters)}</p>`
    let tb=document.createElement('table')
    //let race = [...new Set(strata.data.filtered.map(x=>x.race_ethnicity))]
    let age = [...new Set(strata.data.filtered.map(x=>x.age_group))]
    .sort((a,b)=>{
        //console.log(parseInt(a.match(/^([^\s\-]+).*/)[1]),parseInt(b.match(/^([^\s\-]+).*/)[1]))
        if(parseInt(a.match(/^([^\s\-]+).*/)[1])>parseInt(b.match(/^([^\s\-]+).*/)[1])){
            return 1
        }else{
            return -1
        }
    })
    let causes = [...strata.div0.querySelectorAll('input')].filter(ip=>(ip.checked)&(ip.className=='cause')).map(ip=>ip.value)
    // header
    let trh = document.createElement('tr')
    tb.appendChild(trh)
    let thCause = document.createElement('th')
    thCause.innerHTML="Age &#8594;<br> <br>&#8595; Cause"
    thCause.style.color='maroon'
    thCause.align="left"
    trh.appendChild(thCause)
    age.forEach(ag=>{
        let th = document.createElement('th')
        th.align="right"
        th.style.color='black'
        th.innerHTML=ag
        trh.appendChild(th)
    })
    causes.forEach(c=>{
        let tr = document.createElement('tr')
        tb.appendChild(tr)
        let td = document.createElement('td')
        td.innerHTML=c
        td.style.color='black'
        td.style.fontWeight='bold'
        tr.appendChild(td)
        age.forEach(ag=>{
            let td = document.createElement('td')
            td.align="right"
            td.innerHTML=dt.filter(x=>(x.age_group==ag)).map(x=>x[c]).reduce((a,b)=>a+b)
            tr.appendChild(td)
        })
    })



    div.appendChild(tb)
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
