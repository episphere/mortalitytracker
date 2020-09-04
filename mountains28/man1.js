console.log('man1.js loaded')


man1={data:{}}

man1.getExcessAllCause= async ()=>{
    let data = await (await fetch('https://episphere.github.io/mortalitytracker/mountains28/excessTotalMortality.json')).json()
    man1.data.excessAllCause=data
    return data
};

// ini
man1.ini=async _=>{
    await man1.getExcessAllCause();
    return 'man1.js initialized'
}

man1.getcsv=async(url='https://episphere.github.io/mortalitytracker/mountains28/All%20States%20-%20All%20Cause.csv')=>{
    let arr=[]
    let txt = await(await fetch(url)).text()
    let rows=txt.split(/[\n\r]+/).map(r=>r.split(','))
    let parms= rows[0]
    rows.slice(1).forEach((r,i)=>{
        arr[i]=[]
        r.forEach((v,j)=>{
            if(parms[j]=='Date'){
                arr[i][parms[j]]=new Date(v)
            }else{
                arr[i][parms[j]]=parseFloat(v)
            }
        })
    })
    // restrict range to March 3 to May 26
    let t0 = new Date('2020-03-03T05:00:00.000Z')
    let tf = new Date('2020-05-26T04:00:00.000Z')
    arr=arr.filter(x =>(x.Date >= t0)&(x.Date <=tf ))
    return arr
}

if(typeof(define)!=='undefined'){
    define(man1)
}
