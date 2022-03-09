console.log('deathtracker.js loaded');

/*
if('serviceWorker' in navigator){
    try {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./serviceWorker.js');
        });
    }
    catch (error) {
        console.log(error);
    }
}
*/

dtrack={
    data:{},
    ytitle:'Deaths per week',
    legendX:1.02
}

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
    flag_stroke: 'cerebrovascular_diseases',
    flag_cov19mcod:'covid_19_u071_multiple_cause_of_death',
    flag_cov19ucod:'covid_19_u071_underlying_cause_of_death',
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
    covid_19_u071_multiple_cause_of_death:'COVID-19 (U071, Multiple Cause of Death)',
    covid_19_u071_underlying_cause_of_death:'COVID-19 (U071, Underlying Cause of Death)'
}
dtrack.data.shortName={
    allcause: 'All Cause',
    alzheimer_disease_g30: 'Alzheimer',
    cerebrovascular_diseases: 'Cereb Vasc',
    chronic_lower_respiratory: 'Chron.resp',
    diabetes_mellitus_e10_e14: 'Diabetes',
    diseases_of_heart_i00_i09: 'Heart disease',
    influenza_and_pneumonia_j10: 'Influ&Pneum',
    //jurisdiction_of_occurrence: true,
    malignant_neoplasms_c00_c97: 'Cancer',
    //mmwrweek: true,
    //mmwryear: true,
    naturalcause: 'Natural Cause',
    nephritis_nephrotic_syndrome: 'Kidney',
    other_diseases_of_respiratory: 'Other resp',
    septicemia_a40_a41: 'Septicemia',
    symptoms_signs_and_abnormal: 'Unclassified',
    //weekendingdate: true
    covid_19_u071_multiple_cause_of_death:'with covid',
    covid_19_u071_underlying_cause_of_death:'of covid'
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
    covid_19_u071_multiple_cause_of_death:0,
    covid_19_u071_underlying_cause_of_death:0
}

dtrack.ui=async(div='deathtrackerDiv')=>{
    if(typeof(div)=='string'){
        div=document.getElementById(div)
    }
    //dtrack.data.states = (await (await fetch('https://data.cdc.gov/resource/muzy-jte6.json?$select=distinct%20jurisdiction_of_occurrence')).json()).map(x=>x.jurisdiction_of_occurrence)
    dtrack.data.all=await (await fetch('https://data.cdc.gov/resource/muzy-jte6.json?$limit=10000')).json()
    let tic=new Date()-4*24*60*60*1000
    dtrack.data.all=dtrack.data.all.filter(d=>(new Date(d.week_ending_date)<tic)) // trim future counts
    dtrack.data.all=dtrack.data.all.concat(await (await fetch('https://data.cdc.gov/resource/3yf8-kanr.json?$limit=10000')).json())
    dtrack.data.all=dtrack.data.all.concat(await (await fetch('https://data.cdc.gov/resource/3yf8-kanr.json?$limit=10000&$offset=10000')).json())
    dtrack.data.all=dtrack.data.all.filter(d=>(d.jurisdiction_of_occurrence!='United States'))
    
    // remove problematic states
    let removeIncompleteStates=true
    if(dtrack.ui.parms){
        removeIncompleteStates=!dtrack.ui.parms.incompleteRecords
    }
    if(removeIncompleteStates){
        dtrack.data.all=dtrack.data.all.filter(d=>(d.jurisdiction_of_occurrence!='North Carolina'));
        //dtrack.data.all=dtrack.data.all.filter(d=>(d.jurisdiction_of_occurrence!='North Dakota'));
        //dtrack.data.all=dtrack.data.all.filter(d=>(d.jurisdiction_of_occurrence!='Connecticut'));
        //dtrack.data.all=dtrack.data.all.filter(d=>(d.jurisdiction_of_occurrence!='Pennsylvania'));
    }
    //
    dtrack.data.all=dtrack.cleanData(dtrack.data.all)
    dtrack.data.states=[...new Set(dtrack.data.all.map(x=>x.jurisdiction_of_occurrence))]
    // move All States from end to beginning
    dtrack.data.states.unshift(dtrack.data.states.slice(-1)[0]);dtrack.data.states.pop()
    let h='<hr>Comparing causes of death by <select id="selectCause" onchange="dtrack.plotlyCompareCovid()"></select><br> in 2015-19 and 2020<sup>+</sup> for <select id="selectState" onchange="dtrack.plotlyCompareCovid();setTimeout(dtrack.plotlyWithCovid,1000)"></select> [CDC sources: <a href="https://data.cdc.gov/resource/muzy-jte6" target="_blank">2020-21</a>, <a href="https://data.cdc.gov/resource/3yf8-kanr" target="_blank">2015-19</a>; <a href="https://episphere.github.io/corona/UStable" target="_blank">COVID</a>]'
    h+='<div id="plotlyCompareDiv"></div>'
    h+='Data: [<a id="csvDataLink" href=""></a>]  [<a id="plotDataLink" href=""></a>]<sup><a href="https://episphere.github.io/plot" style="color:brown" target="_blank">csv</a></sup>'
    h+='<hr>'
    //h+='<p style="color:red">Plot under development:</p>'
    h+='<div id="plotlyWithCovidDiv"><span style="color:red">locating COVID-19 data, please wait ... </span></span></div>'
    h+='Data: [<a id="layersDataLink" href=""></a>]<sup><a href="https://episphere.github.io/plot" style="color:brown" target="_blank">csv</a></sup>'
    h+='<hr>'
    h+='<div id="dataDictionaryDiv"></div>'
    div.innerHTML=h
    dtrack.data.states=[dtrack.data.states[0]].concat(dtrack.data.states.slice(1).sort())
    dtrack.data.states.forEach(s=>{
        let opt=document.createElement('option')
        opt.value=opt.innerText=s
        selectState.appendChild(opt)
    })
    Object.keys(dtrack.data.causes).forEach(c=>{
        let opt=document.createElement('option')
        opt.value=c
        opt.innerText=dtrack.data.causes[c]
        //if(opt.innerText.indexOf('(')>0){
        //    opt.innerText=opt.innerText.slice(0,opt.innerText.indexOf('(')-1)
        //}
        if(!c.match('covid_19_u071')){
            selectCause.appendChild(opt)
        }
    })
    let opt=document.createElement('option')
    opt.innerText=opt.value='COVID-19 (CDC)'
    selectCause.appendChild(opt)
    if(location.hash.length>2){
        dtrack.ui.parms=dtrack.ui.parms||{}
        location.hash.slice(1).split('&').forEach(av=>{
            av=av.split("=")
            dtrack.ui.parms[av[0]]=decodeURIComponent(av[1])
        })
        if(dtrack.ui.parms.cause){selectCause.value=dtrack.ui.parms.cause}
        if(dtrack.ui.parms.state){selectState.value=dtrack.ui.parms.state}
    }
    dtrack.plotlyCompareCovid()
    setTimeout(dtrack.plotlyWithCovid,1000)
    setTimeout(dtrack.dataDictionary,600)
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
        if(!d.weekendingdate){
            d.weekendingdate=d.week_ending_date
            d.allcause=parseInt(d.all_cause)
            d.naturalcause=parseInt(d.natural_cause)
        }
        d.weekendingdate=new Date(d.weekendingdate)
        if(d.influenza_and_pneumonia_j09_j18){
            d.influenza_and_pneumonia_j10=parseInt(d.influenza_and_pneumonia_j09_j18)
        }
        return d
    })
    // all states
    let allStates=[]
    let parmsNum = Object.keys(dtrack.data.form)
    dtrack.data.weeks=[... new Set(dtrack.data.all.filter(d=>d.mmwryear==2020).map(d=>d.mmwrweek))]
    //dtrack.data.weeks[52]=52 // stitching end of the year with begining of next
    dtrack.data.weeks=dtrack.data.weeks.slice(0,-1) // jumping 53rd week
    dtrack.data.years=[... new Set(dtrack.data.all.map(d=>d.mmwryear))]
    //dtrack.data.weekends2018=[]
    //dtrack.data.weekends2019=[]
    //dtrack.data.weekends2020=[]
    dtrack.data.years.forEach(yr=>{
        let weekend='weekends'+yr
        dtrack.data[weekend]=[]    
        dtrack.data.weeks.forEach((wk,i)=>{
            dtrack.data[weekend][i]=dtrack.data.all.filter(d=>d.mmwrweek==wk&d.mmwryear==2020).map(d=>d.weekendingdate)[0]
            //dtrack.data.weekends2019[i]=dtrack.data.all.filter(d=>d.mmwrweek==wk&d.mmwryear==2019).map(d=>d.weekendingdate)[0]
            //dtrack.data.weekends2020[i]=dtrack.data.all.filter(d=>d.mmwrweek==wk&d.mmwryear==2020).map(d=>d.weekendingdate)[0]
        })
    })
    //dtrack.data.weekends20201=dtrack.data.weekends2020.concat(dtrack.data.weekends2020.map((x,i)=>new Date(x*1+604800000*52)))
    dtrack.data.weekends20201=dtrack.data.weekends2020.concat(dtrack.data.weekends2020.map((x,i)=>new Date(x*1+604800000*52.22857))).concat(dtrack.data.weekends2020.map((x,i)=>new Date(x*1+604800000*52.22857*2)))
    //debugger
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
    dtrack.data.vars=[... new Set(dt.map(x=>Object.keys(x)).join().split(','))]
    return dt
}

dtrack.trim=function(x){ // trims NaNs trails
    /*
    if(isNaN(x.slice(-1)[0])){
        x.pop()
        return dtrack.trim(x)
    }else{
        return x
    }
    */
    return x
}

dtrack.dataDictionary=(div='dataDictionaryDiv')=>{
    if(typeof(div)=='string'){
        div=document.getElementById(div)
    }
    h=`<p><input id="mortalityRate" type="checkbox" style="height:16px;width:16px" disabled=false> Calculate mortality as weekly rate per 100K people*; <span id="mortalityRateReplot" style="color:red" hidden=true>replotting, please wait ...</span><br><input id="mortalityAdditional" type="checkbox" style="height:16px;width:16px" disabled=false> Calculate additional mortality; ** <span id="mortalityAdditionalReplot" style="color:red" hidden=true>replotting, please wait ...</span><span id="warningShift" style="color:red" hidden=false> unadjusted for demographic shift </span><br><input id="incompleteRecords" type="checkbox" style="height:16px;width:16px" disabled=false> Include States with incomplete records***; <span id="incompleteRecordsReplot" style="color:red;font-size:small" hidden=true>replotting, please wait ...</span><br><span style="color:gray;font-size:medium"><b style="color:gray">*</b> Important: this functionality is provided for convenience, direct comparison of mortality between states is disadvised given the significant demographic differences <b style="color:gray">**</b>; Raw mortality in excess of the last 5 year's average, <b style="color:gray">without <a href="https://pubmed.ncbi.nlm.nih.gov/33316174" target="_blank">adjusting for shift in demographic structure</a></b>. See also <a href="./excess" target="_blank">Excess Mortality</a> for a simplified plot; <b style="color:gray">***</b> For QAQC of states with incomplete records, total counts will be meaningless. For COVID data resolved to county level see <a href="https://episphere.github.io/corona/UStable" target="_blank">US table</a>.</span></p>`
    h+='<p style="color:grey">Note, comparisons with prior years do not account for changes in the age-distribution of the US population over time. For additional information on the impact of these changes, please see <a href="https://www.acpjournals.org/doi/10.7326/M20-7385" target="_blank">Shiels et al (2020)</a>.</p>'
    h+='<h3>Data dictionary</h3><p>'
    Object.keys(dtrack.data.causes).forEach(c=>{
        h+=`<br><b style="color:maroon">${dtrack.data.shortName[c]}</b>: ${dtrack.data.causes[c]}`
    })
    h+='</p>'
    div.innerHTML=h
    dtrack.ui.parms=dtrack.ui.parms||{}
    if(typeof(dtrack.ui.parms.incompleteRecords)=='undefined'){dtrack.ui.parms.incompleteRecords=false}
    incompleteRecords.checked=dtrack.ui.parms.incompleteRecords
}

//dtrack.sum = (xx,n)=>xx.slice(0,n+1).reduce((a,b)=>a+b)
dtrack.sum = (xx,n=xx.length)=>{
    let y=[xx[0]||0]
    for(var i=1;i<n;i++){
        xx[i]=xx[i]||0
        y.push(y[i-1]+xx[i])
    }
    return y
}
dtrack.memb=function(x,dst){ // builds membership function
	var n = x.length-1;
	if(!dst){
		dst = this.sort(x);
		Ind=dst[1];
		dst[1]=dst[1].map(function(z,i){return i/(n)});
		var y = x.map(function(z,i){return dst[1][Ind[i]]});
		return dst;
	}
	else{ // interpolate y from distributions, dst
		var y = this.interp1(dst[0],dst[1],x);
		return y;
	}
}

dtrack.plotlyCompareCovid=async(div='plotlyCompareDiv')=>{
    if(document.getElementById('selectCause').value!=="COVID-19 (CDC)"){
        dtrack.plotlyCompare(div)
        
    }else{ /// PLOT COVID
        location.hash='cause='+document.getElementById('selectCause').value+'&state='+document.getElementById('selectState').value
        //console.log('plot '+document.getElementById('selectCause').value)
        let stateData = dtrack.data.all.filter(x=>(x.jurisdiction_of_occurrence==selectState.value&x.mmwryear>=2020))
        // dtrack.data.weekends2020
        let traces = []
        // covid_19_u071_underlying_cause_of_death
        let yOfCovid=stateData.map(d=>d.covid_19_u071_underlying_cause_of_death)
        dtrack.data.weekends2020=dtrack.data.weekends2020.map(d=>new Date(d.setYear(2020))) // making sure its 2020
        //dtrack.data.weekends20201=[]
        //dtrack.data.weekends20201=dtrack.data.weekends2020.concat(dtrack.data.weekends2020.map((x,i)=>new Date(x*1+604800000*52)))
        dtrack.data.weekends20201=dtrack.data.weekends2020.concat(dtrack.data.weekends2020.map((x,i)=>new Date(x*1+604800000*52.22857))).concat(dtrack.data.weekends2020.map((x,i)=>new Date(x*1+604800000*52.22857*2)))
        // remove trail of zeros

        //debugger
        //let n = dtrack.data.weekends2020.length
        let n = dtrack.data.all.filter(x=>(x.jurisdiction_of_occurrence==selectState.value&x.mmwryear>=2020&x.allcause>0)).length
        let delay = 6
        dtrack.data.latest={
            week:n,
            date:dtrack.data.weekends20201[n],
            delay:delay
        }
        let traceOfCovid={
            x:dtrack.data.weekends20201,
            y:yOfCovid.slice(0,n-delay),
            type: 'scatter',
            mode: 'lines+markers',
            name: 'of COVID',
            marker: {
                color:'maroon',
                size:8
            },
            line:{
                width:3
            },
            fill: 'tozeroy',
            fillcolor: 'rgba(0,100,255,0.2)'
        }
        let traceOfCovidSum={
            x:dtrack.data.weekends20201.slice(0,n-6),
            y:dtrack.sum(yOfCovid),//(yOfCovid.slice(0,n-3)),
            type: 'scatter',
            mode: 'lines',
            name: 'CDC',
            line:{
                width:4,
                color:'rgba(0, 100, 255, 1)',
                dash:'dot'
            },
            yaxis:'y2'
        }
        let yWithCovid=stateData.map(d=>d.covid_19_u071_multiple_cause_of_death)        
        let tlength = dtrack.data.weekends20201.filter(d=>d<Date.now())
        let traceWithCovid={
            x:dtrack.data.weekends20201.slice(0,n-6),
            y:yWithCovid,//.slice(0,n-3),
            type: 'scatter',
            mode: 'lines',
            name: 'with COVID',
            line:{
                width:2,
                //dash:'dot',
                color:'rgba(0,255,0,0.5)'
            }
        }
        let traceWithCovidSum={
            x:dtrack.data.weekends2020,
            y:dtrack.sum(yWithCovid.slice(0,n-3)),
            //y:yWithCovid.slice(0,n-3),
            type: 'scatter',
            mode: 'lines',
            name: '<sup><span style="font-size:12px">additional (CDC)</span></sup>',
            line:{
                width:5,
                dash:'dot',
                color:'rgba(128, 0, 0, 0.5)'
            },
            yaxis:'y2',
            //visible:false
        }
        let traceOfCovidTemp={
            x:dtrack.data.weekends20201.slice(n-delay),
            y:yOfCovid.slice(n-delay,n),
            type: 'scatter',
            mode: 'markers',
            name: 'in progress',
            marker: {
                color:'rgba(255, 255, 255,0.5)',
                size:7,
                line:{
                    color:'black',
                    width:1
                }
            }
        }
        if(!dtrack.data.covid){
            await dtrack.getCovid()
        }
        selectState.value=selectState.value||'All States'
        let traceCovid={
            x:dtrack.data.covid[selectState.value].dates.slice(7),
            y:dtrack.data.covid[selectState.value].deaths.slice(7).map((d,i)=>d-dtrack.data.covid[selectState.value].deaths[i]),
            name:'<span style="font-size:x-small">Johns Hopkins<br>7 day totals</span>',
            type: 'scatter',
            mode: 'lines',
            line:{
                width:2,
                color:'red'
            },
            fill:'tozeroy',
            fillcolor:'rgba(100,10,10,0.2)',
        }
        let traceCovidSum={
            x:dtrack.data.covid[selectState.value].dates,
            y:dtrack.data.covid[selectState.value].deaths,
            name:'<span style="font-size:11px">Johns Hopkins</span>',
            type: 'scatter',
            mode: 'lines',
            line:{
                width:3,
                color:'rgba(255,0,0,1)',
                dash:'dot'
            },
            yaxis:'y2'
        }
        let allTraces = []
        if(document.getElementById('mortalityAdditional')){
            if(mortalityAdditional.checked){
                allTraces=[traceCovid,traceWithCovid,traceOfCovidTemp,traceOfCovid,traceCovidSum,traceOfCovidSum]
                //allTraces=[traceCovid,traceWithCovid,traceOfCovid,traceCovidSum,traceOfCovidSum]
            }else{
                allTraces=[traceCovid,traceWithCovid,traceOfCovidTemp,traceOfCovid]
                //allTraces=[traceCovid,traceWithCovid,traceOfCovid]
            }
        }else{
            allTraces=[traceCovid,traceWithCovid,traceOfCovidTemp,traceOfCovid]
            //allTraces=[traceCovid,traceWithCovid,traceOfCovid]
        }
            
        
        if(document.getElementById('mortalityRate')){
            if(mortalityRate.checked){
                allTraces=dtrack.traceAll(allTraces)
            }
        }
    let titleRight='Raw total additional mortality (<span style="font-size:x-large"> &#8285; </span>)'
    if(document.getElementById('mortalityRate')){
        if(mortalityRate.checked){
            titleRight='Raw total additional mortality per 100K (<span style="font-size:x-large"> &#8285; </span>)'
        }
    }
    if(document.getElementById('mortalityAdditional')){
        if(mortalityAdditional.checked){
            dtrack.legendX=1.2
        }else{
            dtrack.legendX=1.02
        }
    }else{
        dtrack.legendX=1.02
    }

    //debugger
    let layout={
            title:`<span style="font-size:small">Comparing 2020<sup>+</sup> with 2015-2019 death records in <b style="color:green">${selectState.value}</b> by<br><b style="color:maroon">${selectCause.value}</b>, latest record: ${dtrack.data.weekends20201[n].toDateString()}</span>`,
            hovermode: 'closest',
            autosize:true,
            xaxis: {
                title: 'Date'
            },
            yaxis: {
                title:dtrack.ytitle,
                //range:[0,allTraces.map(T=>T.y.reduce((a,b)=>Math.max(a,b)||0)).reduce((a,b)=>Math.max(a,b)||0)]
            },
            legend:{
                bordercolor: 'gray',
                borderwidth: 2,
                traceorder:'reversed',
                //x:1.2,
                //x:1.02,
                x:dtrack.legendX,
                y:1
            },
            yaxis2: {
                title: titleRight, //'Total',// (<span style="font-size:large">&#9679;</span>)',
                titlefont: {color: 'rgb(0, 100, 255)'},
                tickfont: {color: 'rgb(0, 100, 255)'},
                overlaying: 'y',
                side: 'right',
                //type: 'log'
            }
        }
        /* animation
        if(document.getElementById(div).className=='js-plotly-plot'){
            Plotly.animate(div,{
                data:allTraces,
                layout:layout
            },
            {
                transition: {
                  duration: 500,
                  easing: 'cubic-in-out'
                },
                frame: {
                  duration: 500
                }
            })
        }else{
            Plotly.newPlot(div,allTraces,layout, {responsive: true})
        }
        */
        Plotly.newPlot(div,allTraces,layout, {responsive: true})
        //debugger
        
    dtrack.csvData(allTraces,layout)
    }
}

dtrack.plotlyCompare=async(div='plotlyCompareDiv')=>{
    location.hash='cause='+document.getElementById('selectCause').value+'&state='+document.getElementById('selectState').value
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
    dtrack.data.traces=traces
    //dtrack.data.years.sort().slice(0,-2).forEach(yr=>{ // all years exept the last two, 2020 and 2021
    dtrack.data.refYears=[2014,2015,2016,2017,2018,2019]
    dtrack.data.refYears.forEach(yr=>{ // reference 5 year period
        addTrace(yr)
    })

    //let data2020 = stateData.filter(x=>(x.mmwryear>=2020&x.allcause>0))
    let data2020 = stateData.filter(x=>(x.mmwryear==2020))
    let data20201 = stateData.filter(x=>(x.mmwryear>=2020)).filter(x=>x.allcause>0)
    let weeks = dtrack.data.weeks.concat(dtrack.data.weeks.map(x=>x+52))
    //let delay=dtrack.data.weekends2020.length-data2020.map(x=>x[selectCause.value]).length // different states / causes updating at different rates
    //if(delay>2){delay=-delay} // for unusually short series
    let delay = 6 // weeks
    //debugger
    let trace20201 = { // the old trace2020 actually ...
        //x:dtrack.data.weekends2020.slice(0,-2+delay),  //weeks,
        x:(dtrack.data.weekends2020.concat(dtrack.data.weekends2020.slice(0,data2020.length-dtrack.data.weekends2020.length))).map((xi,i)=>{
            if(i>=dtrack.data.weekends2020.length){
                return Date(xi.toString().replace('2020','2021'))
            }else{
                return xi
            }
        }),
        y:data2020.map(x=>x[selectCause.value]),//.slice(0,-2+delay),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2020 CDC',
        marker: {
            color:'maroon',
            size:8
        },
        line:{
            width:3
        },
        fill: 'tonexty',
        //fillcolor: 'rgba(128,0,0,0.2)'
        fillcolor: 'rgba(0,100,255,0.2)'
    }

    let trace2020 = {
        //x:dtrack.data.weekends2020.slice(0,-2+delay),  //weeks,
        x:dtrack.data.weekends20201,
        y:data20201.map(x=>x[selectCause.value]).slice(0,-delay),//.slice(0,-2+delay),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2020<sup>+</sup> CDC',
        marker: {
            color:'maroon',
            size:8
        },
        line:{
            width:3
        },
        fill: 'tonexty',
        //fillcolor: 'rgba(128,0,0,0.2)'
        fillcolor: 'rgba(0,100,255,0.2)'
    }


    //debugger
    let tempy=dtrack.trim(data2020.map(x=>x[selectCause.value]))
    let tempx=dtrack.data.weekends2020.slice(0,tempy.length)
    let trace2020temp = {
        //x:dtrack.data.weekends2020.slice(-3,-1),  //weeks,
        //y:data2020.map(x=>x[selectCause.value]).slice(-3+delay),
        //x:tempx.slice(-3),
        //y:tempy.slice(-3),
        x:dtrack.data.weekends20201.slice(trace2020.y.length),
        y:data20201.map(x=>x[selectCause.value]).slice(-delay),
        type: 'scatter',
        //mode: 'lines+markers',
        mode: 'markers',
        name: 'Counting<br>in progress',
        marker: {
            color:'rgba(255, 255, 255,0.5)',
            size:7,
            line:{
                color:'maroon',
                width:1
            }
        },
        line: {
            color:'silver',
            dash: 'dot'
            }
    }

    // shaded range
    let valueRange={
        x:dtrack.data.weeks,
        avg:dtrack.data.weeks.map(x=>0),
        max:dtrack.data.weeks.map(x=>0),
        min:dtrack.data.weeks.map(x=>0)
    }
    let ni = [] // number of valid counts
    traces.slice(1).forEach(r=>{
        r.y.map((v,i)=>{
            if(ni.length<=i){ni[i]=0}
            if(v){
                ni[i]++
                valueRange.avg[i]+=r.y[i]
                if(v>valueRange.max[i]){valueRange.max[i]=v}
                if(valueRange.min[i]==0){valueRange.min[i]=v}
                if(v<valueRange.min[i]){valueRange.min[i]=v}
            }
        })
        //debugger
    })
    valueRange.avg=valueRange.avg.map((v,i)=>v/ni[i]) // average

    let traceAvg={ // dev2021
        x:dtrack.data.weekends20201,
        y:valueRange.avg.concat(valueRange.avg).concat(valueRange.avg).slice(0,trace2020.y.length),
        type: 'scatter',
        mode: 'lines+markers',
        name: '2015-19<br>average',
        line: {
            color:'black',
            width:2
        },
        marker:{
            size:5
        }
    }
    
    //let traceAvgBlank = Object. assign({}, traceAvg)
    let traceAvgBlank=JSON.parse(JSON.stringify(traceAvg)) 
    traceAvgBlank.mode='lines'
    traceAvgBlank.line.width=0
    traceAvgBlank.x=trace2020.x
    traceAvgBlank.name='________'

    var traceMin = { // dev2021
      //x: dtrack.data.weekends2020,
      x: dtrack.data.weekends20201,
      //y: valueRange.min,
      y: valueRange.min.concat(valueRange.min).concat(valueRange.min).slice(0,trace2020.y.length),
      fill: 'toself',
      type: 'scatter',
      mode: 'none',
      fillcolor: 'rgba(200,200,200,0)',
      name:'(2015-19)'
    }
    var traceMax = { // dev2021
      x: dtrack.data.weekends20201,
      y: valueRange.max.concat(valueRange.max).concat(valueRange.max).slice(0,trace2020.y.length),
      fill: 'tonexty',
      type: 'scatter',
      mode: 'none',
      fillcolor: 'rgba(200,200,200,0.75)',
      name:'value range'
    };
    let dev = trace2020.y.map((v,i)=>v-traceAvg.y[i])
    //let sum = (xx,n)=>xx.slice(0,n+1).reduce((a,b)=>a+b) // incremental sum
    var traceExcess = {
        x:trace2020.x,
        y:dtrack.sum(dev),
        type: 'scatter',
        mode: 'lines',
        name: '<span style="font-size:12">Additional<br>mortality,<br><span style="font-size:10">unadjusted for<br>demographic<br>shift (**)</span></span>',
        line: {
            color:'rgba(0,100,255,0.5)',
            //color:'rgba(128,0,0,0.5)',
            width:3,
            dash: 'dot'
        },
        marker:{
            size:5
        },
        yaxis: 'y2'
    }

    var traceSum5yr = {
        x:traceAvg.x,
        y:dtrack.sum(traceAvg.y),
        type: 'scatter',
        mode: 'lines',
        name: 'Avg Sum',
        line: {
            //color:'rgba(0,100,255,0.5)',
            color:'rgba(0,0,0,0.3)',
            width:3
        },
        fill:'tozeroy',
        fillcolor:'rgba(0,0,0,0.2)',
        yaxis: 'y2'
    }

    var traceSum2020 = {
        x:trace2020.x,
        y:dtrack.sum(trace2020.y),
        type: 'scatter',
        mode: 'lines',
        name: '2020 Sum',
        line: {
            //color:'rgba(0,100,255,0.5)',
            color:'rgba(128,0,0,0.3)',
            width:3
        },
        fill:'tozeroy',
        fillcolor:'rgba(128,0,0,0.2)',
        yaxis: 'y2'
    }

    let titleCause = dtrack.data.causes[selectCause.value]
    if((titleCause)=="Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified (R00-R99)"){
        titleCause = 'Unclassified symptoms, signs and abnormal findings'
    }
    let allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,trace2020,trace2020temp])
    //let allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,trace2020])
    if(document.getElementById('mortalityAdditional')){
        if(mortalityAdditional.checked){
            //allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,trace2020,trace2020temp,traceExcess])
            allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,trace2020,trace2020temp,traceExcess])
        }
    }   
    
    if(selectCause.value=='allcause'){ // add covid
        if(!dtrack.data.covid){
            await dtrack.getCovid()
        }
        // add JH covid
        let cvData = dtrack.data.covid[selectState.value]
        let cvTrace={
            x:cvData.dates,
            y:cvData.deaths,
            type: 'scatter',
            mode: 'lines',
            name: 'COVID JH',
            line: {
                //color:'rgba(0,100,255,0.5)',
                //color:'rgba(128,0,0,0.5)',
                color:'red',
                width:2,
                dash: 'dot'
            },
            yaxis: 'y2'

        }
        let trace2020ofCovid = {
            x:dtrack.data.weekends2020,//.slice(0,-3+delay),  //weeks,
            y:data2020.map((x,i)=>x.covid_19_u071_underlying_cause_of_death+traceAvg.y[i]),//.slice(0,-3+delay),
            type: 'scatter',
            mode: 'lines',
            name: 'COVID CDC',
            line:{
                width:1,
                color:'rgba(255,0,0,0.75)'
            },
            fill: 'tonexty',
            //fillcolor: 'rgba(128,0,0,0.2)'
            fillcolor: 'rgba(100,0,255,0.1)'
        }
        //debugger
        let allTraces=[]
        if(document.getElementById('mortalityAdditional')){
            if(mortalityAdditional.checked){
                //allTraces=traces.slice(1).concat([traceExcess,traceMin,traceMax,traceAvg,traceAvgBlank,cvTrace,JSON.parse(JSON.stringify(traceAvgBlank)),trace2020ofCovid,trace2020,trace2020temp])
                allTraces=traces.slice(1).concat([traceExcess,traceMin,traceMax,traceAvg,traceAvgBlank,cvTrace,JSON.parse(JSON.stringify(traceAvgBlank)),trace2020ofCovid,trace2020])
            }else{
                //allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,JSON.parse(JSON.stringify(traceAvgBlank)),trace2020ofCovid,trace2020,trace2020temp])
                //debugger
                allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,JSON.parse(JSON.stringify(traceAvgBlank)),trace2020ofCovid,trace2020])
            }  
        }else{
            //allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,JSON.parse(JSON.stringify(traceAvgBlank)),trace2020ofCovid,trace2020,trace2020temp])
            //debugger
            allTraces=traces.slice(1).concat([traceMin,traceMax,traceAvg,traceAvgBlank,JSON.parse(JSON.stringify(traceAvgBlank)),trace2020ofCovid,trace2020])
        }
             
    }
    if(document.getElementById('mortalityRate')){
        if(mortalityRate.checked){
            allTraces=dtrack.traceAll(allTraces)
        }
    }
    let titleRight='Raw total additional mortality (<span style="font-size:x-large"> &#8285; </span>)'
    if(document.getElementById('mortalityRate')){
        if(mortalityRate.checked){
            titleRight='Raw total additional mortality per 100K (<span style="font-size:x-large"> &#8285; </span>)'
        }
    }
    //debugger //trace2020.y.length+delay[trace2020.y.length+delay].toDateString()
    dtrack.data.latest={
        week:trace2020.y.length+delay,
        date:dtrack.data.weekends20201[trace2020.y.length+delay],
        delay:delay
    }
    let layout = {
        //title:`<span style="font-size:small">Comparing 2020<sup>+</sup> with 2015-2019 death records in <b style="color:green">${selectState.value}</b> by<br><b style="color:maroon">${titleCause}</b>, latest CDC record: ${dtrack.data.latest.date.toDateString()}</b></span>`,
        title:`<span style="font-size:small">Comparing 2020<sup>+</sup> with 2015-2019 death records in <b style="color:green">${selectState.value}</b> by<br><b style="color:maroon">${titleCause}</b>, latest CDC record: ${dtrack.data.latest.date?dtrack.data.latest.date.toDateString():Date()}</b></span>`,
        hovermode: 'closest',
        height:530,
        xaxis: {
            title: 'Date',
            //range: [new Date('Dec 31 2019'),new Date('Dec 31 2020')]
        },
        yaxis: {
            title: dtrack.ytitle
        },
        legend:{
            bordercolor: 'gray',
            borderwidth: 1,
            //x:1.2,
            //x:1.02,
            x:dtrack.legendX,
            y:1
        },
        yaxis2: {
            title: titleRight,//'Total',// (<span style="font-size:large">&#9679;</span>)',
            titlefont: {color: 'rgb(0, 100, 255)'},
            tickfont: {color: 'rgb(0, 100, 255)'},
            overlaying: 'y',
            side: 'right',
            //type: 'log'
        },
        //hovermode:'closest',
    }   
    Plotly.newPlot(div,allTraces,layout, {responsive: true})
    //div.innerHTML=Date()
    dtrack.csvData(allTraces,layout)
}

dtrack.getCovid=async()=>{
    dtrack.data.covid=corona.byState(await corona.getUSA())
    dtrack.data.covid['All States']={}
    dtrack.data.covid['All States'].dates=dtrack.data.covid.Alabama.dates // dates are the same for all states
    dtrack.data.covid['All States'].deaths=dtrack.data.covid['All States'].dates.map(x=>0)
    dtrack.data.covid['All States'].confirmed=dtrack.data.covid['All States'].dates.map(x=>0)
    dtrack.data.covid['All States'].Population=0
    Object.keys(dtrack.data.covid).map(s=>{ // for each state
        if(s!='All States'){
            dtrack.data.covid['All States'].Population+=dtrack.data.covid[s].Population
            //console.log(s,dtrack.data.covid[s].Population,dtrack.data.covid['All States'].Population)
            dtrack.data.covid['All States'].deaths.forEach((d,i)=>{
                dtrack.data.covid['All States'].deaths[i]+=dtrack.data.covid[s].deaths[i]
                dtrack.data.covid['All States'].confirmed[i]+=dtrack.data.covid[s].confirmed[i]
            })
        }
    })
    // wrangle NYC out of NY state to match CDC regions
    dtrack.data.covid['New York City']={
        Population:0,
        dates:dtrack.data.covid['New York'].dates,
        confirmed:dtrack.data.covid['New York'].dates.map(x=>0),
        deaths:dtrack.data.covid['New York'].dates.map(x=>0),
        county:{}
    }
    let nycCounties=['Bronx','Kings','New York','Queens','Richmond']
    nycCounties.forEach(nm=>{
        dtrack.data.covid['New York City'].county[nm]={}
        Object.assign(dtrack.data.covid['New York City'].county[nm],dtrack.data.covid['New York'].county[nm])
        delete dtrack.data.covid['New York'].county[nm]
        // Population
        dtrack.data.covid['New York City'].Population+=dtrack.data.covid['New York City'].county[nm].Population
        dtrack.data.covid['New York'].Population-=dtrack.data.covid['New York City'].county[nm].Population
        // Confirmed
        dtrack.data.covid['New York City'].confirmed=dtrack.data.covid['New York City'].confirmed.map((v,i)=>{
            return v+dtrack.data.covid['New York City'].county[nm].confirmed[i]
        })
        dtrack.data.covid['New York'].confirmed=dtrack.data.covid['New York'].confirmed.map((v,i)=>{
            return v-dtrack.data.covid['New York City'].county[nm].confirmed[i]
        })
        // deaths
        dtrack.data.covid['New York City'].deaths=dtrack.data.covid['New York City'].deaths.map((v,i)=>{
            return v+dtrack.data.covid['New York City'].county[nm].deaths[i]
        })
        dtrack.data.covid['New York'].deaths=dtrack.data.covid['New York'].deaths.map((v,i)=>{
            return v-dtrack.data.covid['New York City'].county[nm].deaths[i]
        })
    })
    // reset for day 117 county swap
    let ny=['New York','New York City']
    ny.forEach(ste=>{
        let k = dtrack.data.covid[ste].deaths[117]-dtrack.data.covid[ste].deaths[116]
        let n = dtrack.data.covid[ste].deaths.length
        for(var i = 117;i<n;i++){
            dtrack.data.covid[ste].deaths[i]=dtrack.data.covid[ste].deaths[i]-k
        }
    })
}

dtrack.plotlyWithCovid=async(div='plotlyWithCovidDiv')=>{
    if(!dtrack.data.covid){
        await dtrack.getCovid()
    }
    location.hash='cause='+document.getElementById('selectCause').value+'&state='+document.getElementById('selectState').value
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
            //x:dtrack.data.weekends20201,
            y:data.map(x=>x.allcause),
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
    //dtrack.data.traces=traces
    dtrack.data.years.sort().slice(0,-1).forEach(yr=>{ // all years exept the last, 2020
        addTrace(yr)
    })

    let data2020 = stateData.filter(x=>x.mmwryear>=2020)
    //let weeks = data2020.map(x=>parseInt(x.mmwrweek))
    //debugger
    let weeks = dtrack.data.weeks.concat(dtrack.data.weeks)
    let selectCause_value='All Cause'
    let delay=dtrack.data.weekends2020.length-data2020.map(x=>x[selectCause_value]).length // different states / causes updating at different rates
    if(delay>2){delay=-delay+2}
    let y2020=data2020.map(x=>x[selectCause_value])//.slice(0,-3+delay) 
    //debugger
    /*
    let trace2020 = {
        x:dtrack.data.weekends2020.slice(0,-3+delay),  //weeks,
        y:data2020.map(x=>x[selectCause_value]).slice(0,-3+delay),
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
        x:dtrack.data.weekends2020.slice(-3,-1),  //weeks,
        y:data2020.map(x=>x[selectCause.value]).slice(-3+delay),
        type: 'scatter',
        //mode: 'lines+markers',
        mode: 'markers',
        name: 'counting <br>in progress',
        marker: {
            color:'rgba(255, 255, 255,0.25)',
            size:7,
            line:{
                color:'maroon',
                width:1
            }
        },
        line: {
            color:'silver',
            dash: 'dot'
            }
    }
    */

    // shaded range
    let valueRange={
        x:dtrack.data.weeks.concat(dtrack.data.weeks),
        avg:dtrack.data.weeks.map(x=>0),
        max:dtrack.data.weeks.map(x=>0),
        min:dtrack.data.weeks.map(x=>0)
    }
    let ni = [] // number of valid counts
    traces.slice(1,5).forEach(r=>{
        r.y.map((v,i)=>{
            if(ni.length<=i){ni[i]=0}
            if(v){
                ni[i]++
                valueRange.avg[i]+=r.y[i]
                if(v>valueRange.max[i]){valueRange.max[i]=v}
                if(valueRange.min[i]==0){valueRange.min[i]=v}
                if(v<valueRange.min[i]){valueRange.min[i]=v}
            }
        })
        //debugger
    })
    valueRange.avg=valueRange.avg.map((v,i)=>v/ni[i]) // average

    let traceAvg={
        x:dtrack.data.weekends20201.slice(0,dtrack.data.latest.week),
        y:valueRange.avg.concat(valueRange.avg).concat(valueRange.avg),
        type: 'scatter',
        mode: 'lines',
        name: 'average<sub>2015-9</sub>',
        line: {
            color:'gray',
            width:1
        },
        marker:{
            size:9
        }
    }
    /*var traceBase = {
      x: dtrack.data.weekends2020,
      y: dtrack.data.weekends2020.map,
      type: 'scatter',
      name:'base'
    }
    */
    var traceMin = {
      x: traceAvg.x,
      y: valueRange.min.concat(valueRange.min).concat(valueRange.min),
      fill: 'toself',
      type: 'scatter',
      mode: 'none',
      fillcolor: 'rgba(200,200,200,0)',
      name:'__________'
    }
    var traceMax = {
      x: traceAvg.x,
      y: valueRange.max.concat(valueRange.max).concat(valueRange.max),
      fill: 'tonexty',
      type: 'scatter',
      mode: 'none',
      fillcolor: 'rgba(200,200,200,0.5)',
      name:'range <sub> 2015-9</sub>'
    };
    //let stateData2020=stateData.filter(s=>s.mmwryear==2020).slice(0,-2)
    let delayAllCause=dtrack.data.weekends2020.length-data2020.map(x=>x["All Cause"]).length // different states / causes updating at different rates
    if(delayAllCause>2){delayAllCause=-delayAllCause+2} // for unusually short series
    let traceAllCause={
        //x:dtrack.data.weekends2020,//.slice(0,-3+delay),
        x:traceAvg.x.slice(0,-dtrack.data.latest.delay),
        y:data2020.map(s=>s.allcause),//.slice(0,-3+delay),
        name:'All Cause <sub>2020</sub>',
        type: 'scatter',
        mode: 'lines',
        line:{
            width:3,
            color:'black'
        }
    }
    let traceNaturalCause={
        //x:dtrack.data.weekends2020,//.slice(0,-3+delay),
        x:traceAllCause.x,
        y:data2020.map(s=>s.naturalcause),//.slice(0,-3+delay),
        name:'NaturalCause',
        type: 'scatter',
        mode: 'lines',
        line:{
            dash:'dot',
            color:'black'
        }
    }
    let causeTraces=[]
    let traceOfCovid={}
    Object.keys(dtrack.data.causes).reverse().forEach((c,i)=>{
        if(c!='allcause'&c!='naturalcause'){
            let delay=dtrack.data.weekends2020.length-data2020.map(x=>x[c]).length // different states / causes updating at different rates
            if(delay>2){delay=-delay+2} // for unusually short series
            let trace={
                //x:dtrack.data.weekends2020,//.slice(0,-3+delay),
                x:traceAllCause.x,
                y:data2020.map(s=>s[c]),//.slice(0,-3+delay),
                //name:dtrack.data.causes[c].slice(0,10),
                name:dtrack.data.shortName[c].slice(0,12),
                type: 'scatter',
                mode: 'lines',
                opacity:0.5,
                //fill: 'tonexty',
                stackgroup: 'causes',
                //fill:'none'
            }
            if(trace.name!='with covid'){
                if(trace.name=='of covid'){
                    traceOfCovid=trace
                }else{
                    causeTraces.push(trace) 
                }
            }
            
        }
    })


    let traceCovid={
        x:dtrack.data.covid[selectState.value].dates.slice(7),
        y:dtrack.data.covid[selectState.value].deaths.slice(7).map((d,i)=>d-dtrack.data.covid[selectState.value].deaths[i]),
        name:'COVID-19<br><span style="font-size:x-small">7 day totals<br>(Johns Hopkins)</span>',
        type: 'scatter',
        mode: 'lines',
        line:{
            width:2,
            color:'red'
        },
        fill:'tozeroy',
        fillcolor:'rgba(100,10,10,0.3)',
    }


    //Plotly.newPlot(div,traces.slice(1).concat([traceMin,traceMax,traceAvg,trace2020,trace2020temp]),{
    div.innerHTML='' // clear
    let allTraces=causeTraces.concat([traceOfCovid,traceMin,traceMax,traceAvg,traceAllCause,traceNaturalCause,traceCovid])
    if(mortalityRate.checked){
        allTraces=dtrack.traceAll(allTraces)
    }
    //debugger
    let layout={
        //title:`<span style="font-size:small">COVID-19 mortality context for <b style="color:green">${selectState.value}</b>, pop. <span style="color:navy">${dtrack.data.covid[selectState.value].Population.toLocaleString()}</span><br>latest CDC record: ${dtrack.data.latest.date.toDateString()}</span>`, // latest record: ${dtrack.data.covid['All States'].dates.slice(-1)[0].toDateString().slice(0,10)}</b>`,
        title:`<span style="font-size:small">COVID-19 mortality context for <b style="color:green">${selectState.value}</b>, pop. <span style="color:navy">${dtrack.data.covid[selectState.value].Population.toLocaleString()}</span><br>latest CDC record: ${dtrack.data.latest.date?dtrack.data.latest.date.toDateString():Date()}</span>`, // latest record: ${dtrack.data.covid['All States'].dates.slice(-1)[0].toDateString().slice(0,10)}</b>`,
        height:570,
        hovermode: 'closest',
        xaxis: {
            title: 'Date'
        },
        yaxis: {
            title: dtrack.ytitle
        },
        legend:{
            bordercolor: 'gray',
            borderwidth: 2,
            //x:1.2,
            //x:1.02,
            x:dtrack.legendX,
            y:1
        }
    }
    Plotly.newPlot(div,allTraces,layout, {responsive: true})
    //div.innerHTML=Date()
    mortalityRate.onchange=()=>{
        mortalityRateReplot.hidden=false
        if(mortalityRate.checked){
            dtrack.ytitle='Weekly mortality per 100K'
        }else{
            dtrack.ytitle='Deaths per Week'
        }
        setTimeout(selectState.onchange,100)
        setTimeout(selectCause.onchange,100)
        //debugger
    }
     mortalityAdditional.onchange=()=>{
         mortalityAdditionalReplot.hidden=false
         warningShift.hidden=true
        if(mortalityAdditional.checked){
            dtrack.legendX=1.2
        }else{
            dtrack.legendX=1.02
        }
        setTimeout(selectState.onchange,100)
        setTimeout(selectCause.onchange,100)
        //debugger
    }
    incompleteRecords.onchange=()=>{
        incompleteRecordsReplot.hidden=false
        dtrack.ui.parms.incompleteRecords=incompleteRecords.checked
        dtrack.ui()
    }
    mortalityRate.disabled=false
    mortalityAdditional.disabled=false
    incompleteRecords.disabled=false
    mortalityAdditionalReplot.hidden=mortalityRateReplot.hidden=incompleteRecordsReplot.hidden=true
    warningShift.hidden=false
    layersDataLink.innerText=selectState.value+' dataLayers.json'
    layersDataLink.href='#'
    layersDataLink.onclick=()=>{
        dtrack.saveFile(JSON.stringify({traces:allTraces,layout:layout}),layersDataLink.innerText)
    }
}

dtrack.traceAll=(traces)=>{ // annualized mortality rate
    return traces.map(trc=>{
        //trc.y=trc.y.map(yi=>yi*(365.6/7)/(dtrack.data.covid[selectState.value].Population/100000))
        trc.y=trc.y.map(yi=>yi/(dtrack.data.covid[selectState.value].Population/100000))
        return trc
    })
}

dtrack.csvData=(traces,layout)=>{
    let shortVarName = dtrack.data.shortName[selectCause.value]
    let fname = selectState.value+' - '+shortVarName//+'.csv'
    if(typeof(shortVarName)=='undefined'){ // covid
        fname = selectState.value+' - '+selectCause.value//+'.csv'
    }
    if(document.getElementById('mortalityRate')){
        fname= mortalityRate.checked? fname+' per 100k.csv' : fname+'.csv'
    }else{
        fname=fname+'.csv'
    }
    
    csvDataLink.innerText=fname
    csvDataLink.href=location.hash
    csvDataLink.onclick=function(){
        let txt=`Date,Average 2015-2019,${shortVarName}`
        let trc1 = traces.filter(x=>x.name=="2020<sup>+</sup> CDC")
        if(trc1.length==1){ // this is not covid
            trc1=trc1[0]
            let trc2 = traces.filter(x=>x.name=="2015-19<br>average")[0]
            trc1.x.forEach((xi,i)=>{
                txt+=`\n${xi.toISOString()},${trc2.y[i]},${trc1.y[i]}`
            })
            
        }else{ // covid
            txt=`Date,Average 2015-2019,of COVID, with CIVID`
            trc1 = traces.filter(x=>x.name=="of COVID")[0]
            trc2 = traces.filter(x=>x.name=="with COVID")[0]
            //trc1.x.slice(0,-3).forEach((xi,i)=>{
            trc1.x.forEach((xi,i)=>{
                txt+=`\n${xi.toISOString()},0,${trc1.y[i]},${trc2.y[i]}`
            })
        }
        dtrack.saveFile(txt,fname)
    }
    plotDataLink.innerText=fname.slice(0,-4)+' - plot.json'
    plotDataLink.href=location.hash
    plotDataLink.onclick=()=>{dtrack.saveFile(JSON.stringify({traces:traces,layout:layout}),plotDataLink.innerText)}
}

dtrack.saveFile=function(x,fileName) { // x is the content of the file
	var bb = new Blob([x]);
   	var url = URL.createObjectURL(bb);
	var a = document.createElement('a');
   	a.href=url;
	if (fileName){
		if(typeof(fileName)=="string"){ // otherwise this is just a boolean toggle or something of the sort
			a.download=fileName;
		}
		a.click() // then download it automatically 
	} 
	return a
}

if(typeof(define)!=='undefined'){
    define(dtrack)
}