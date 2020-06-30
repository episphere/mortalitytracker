console.log('man1.js loaded')


man1={data:{}}

man1.getExcessAllCause= async ()=>{
    let data = await (await fetch('https://episphere.github.io/mortalitytracker/manuscript1/excessTotalMortality.json')).json()
    man1.data.excessAllCause=data
    return data
};

// ini
man1.ini=async _=>{
    await man1.getExcessAllCause();
    return 'man1.js initialized'
}

if(typeof(define)!=='undefined'){
    define(man1)
}
