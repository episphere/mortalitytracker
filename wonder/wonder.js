console.log('wonder.js loaded')

wonder={}


wonder.parserDiv=(div='wonderDivParser')=>{
    if(typeof(div)=='string'){
        div = document.getElementById(div)
    }
    div = div||document.createElement('div')
    let h = `<div><p>Read file(s), drag&drop supported:<br>Upload <input type="file" id="loadFiles" multiple></p><p>or from URL: <button onclick="wonder.demo(1)" style="font-size:small">Demo1</button><button onclick="wonder.demo(2)" style="font-size:small">Demo2</button><button onclick="wonder.demo(3)" style="font-size:small">Demo3</button><br><input id="inputWonderURL" size=50><button id="loadURLbutton" onclick="wonder.loadFromURL()">load</button><span onclick="window.open(inputWonderURL.value)" style="cursor:pointer;cursor:green">&#8599;</span></p></div>`
    
    h+='<div id="wonderDataDiv"></div>'
    div.innerHTML=h
    loadFiles.onchange=evt=>{
        for(let i=0 ; i<loadFiles.files.length ; i++){
            let fr=new FileReader(); 
            fr.onload=function(){
                wonder.parseTxt(this.result,loadFiles.files[i].name,loadFiles.files[i].lastModifiedDate) 
            }
            fr.readAsText(loadFiles.files[i]);
        }
    }
    return div
}

wonder.loadFromURL=async(url)=>{
    url=url||inputWonderURL.value // default picked from input with id inputWonderURL
    let txt = await (await fetch(url)).text()
    wonder.parseTxt(txt,url)
}

wonder.demo=i=>{
    let urls=['Underlying Cause of Death, 1999-2018 D91F042.txt','Underlying Cause of Death, 1999-2018 D91F044.txt','Underlying Cause of Death, 1999-2018 D91F045.txt']
    let url=urls[i-1]
    inputWonderURL.value='https://episphere.github.io/mortalitytracker/wonder/'+url
    loadURLbutton.click()
}

wonder.parseTxt=(txt,fname,lastModifiedDate,div0=document.getElementById('wonderDataDiv'))=>{
    if(typeof(txt)=='object'){
        txt=txt.result
    }
    lastModifiedDate=lastModifiedDate||new Date(Date.now())
    let y = {fname:fname,txt:txt,lastModifiedDate:lastModifiedDate}
    console.log(y)
    //
    // assemble results array structure here
    wonder.data=wonder.data||[]
    //let y={}
    // parsing
    let rr = txt.split(/[\n\r]+/g) // rows
    rr=rr.map(r=>r.split(/\t/).map(v=>{
        //console.log(v)
        try{
            v=JSON.parse(v)
        } catch(err){}
        return v
    }))
    let sep=[] // block separators
    rr.forEach((r,i)=>{
        if(r[0]=="---"){
            sep.push(i)
        }
    })
    // extract 1st block, the table
    //y.rr=rr
    let rr1 = rr.slice(0,sep[1])
    let tb=[]
    let parms=rr1[0]
    rr1.slice(1).forEach((r,i)=>{
        let x={}
        parms.forEach((p,j)=>{
            x[p]=r[j]
        })
        tb[i]=x
    })
    y.dt=tb
    wonder.data.push(y)
    if(div0){ // if a division is defined for visualization
        let div=document.createElement('div')
        //div.innerHTML='...'
        div0.prepend(div)
        wonder.showData(div,y)
    }
    //debugger
    return y
}

wonder.saveFile=function(x,fileName) { // x is the content of the file
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

wonder.saveJson=i=>{
    let data = wonder.data[i-1]
    wonder.saveFile(JSON.stringify(data),data.fname.match(/([^\/]+)\.[^\/]+$/)[1]+'.json')
}

wonder.showData=(div,data)=>{
    let i = div.parentElement.childElementCount
    let h =`<hr>` // clear div
    h += `<h3>${i}. ${data.fname}</h3>`
    h += `<li><b>Last modified:</b> ${data.lastModifiedDate}</li>`
    h += `<li><b>Fields (${Object.keys(data.dt[0]).length}):</b> ${Object.keys(data.dt[0]).join(',')}</li>`
    h += `<li><b>Export (${data.dt.length}):</b> <button onclick="wonder.saveJson(${i})">JSON</button> <button>CSV</button></li>`
    h += `<li><b>Show:</b> <button>Table</button> <button>Query</button> <button>Metadata</button></li>`
    h += `<div id="showDataDetail"></div>`
    div.innerHTML=h
    return div
}

if(typeof(define)!='undefined'){
    define(wonder)
}