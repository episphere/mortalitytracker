const http = require('http');
const https = require('https');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req0, res0) => {
  res0.setHeader("Content-Type","application/json")
  res0.setHeader("Access-Control-Allow-Origin","*")
  res0.statusCode = 200;
  let msg='hello world at '+ Date()
  if(req0.headers.origin){
      if((req0.headers.origin=='https://episphere.github.io')|(req0.headers.origin=='http://localhost:8000')|(req0.headers.origin=='https://episphere.static.observableusercontent.com')){
        let url=`https://api.census.gov${decodeURIComponent(req0.url.slice(2))}&key=${process.env.censuskey}`
        https.get(url, res => {
          res.setEncoding("utf8");
          let body = "";
          res.on("data", data => {
            body += data;
          });
          res.on("end", () => {
            res0.end(body);
          });
        });
      }else{
        res0.end('restricted to episphere, not '+req0.headers.origin);
      }
  }else{
    res0.end('restricted to episphere');
  }
  
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});