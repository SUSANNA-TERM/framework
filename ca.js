// Import modules
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { execSync }=  require('child_process');
const readline = require('readline')
const basicAuth = require('express-basic-auth')



// Import the express module
const express = require("express");

// Instantiate an Express application
const app = express();

// Set maximum post size
app.use(express.json({limit: '10mb'})); 

// Server password
let server_pass = base64_encode(crypto.randomBytes(18));

// Basic authentication
/*
var userAuth = basicAuth({
    users: { 'admin': server_pass },
    challenge: true
});*/

var userAuth = basicAuth({
    users: { 'admin': 'admin' },
    challenge: true
});


app.get('/', userAuth, (req, res) => {

	res.status(200).sendFile(__dirname+"/public/index.html");
});

app.get('/get/:folder', (req, res) => {
  const folder = req.params.folder;
  if (folder.search(/^[a-zA-Z0-9-_]+$/) === -1 || folder.length != 24)
    return res.status(404).json({ "result": "Folder not found", "success": false });
    
  
  if (!fs.existsSync(__dirname+"/public/get/"+folder))
    return res.status(404).json({ "result": "Folder not found", "success": false });

  if (!fs.existsSync(__dirname+"/public/get/"+folder+"/test.txt"))
    return res.status(404).json({ "result": "File not found", "success": false });
      

    
  res.status(200).sendFile(__dirname+"/public/get/"+folder+"/test.txt");
});

let csr_country, csr_state, csr_locality,  csr_organization,  csr_org_unit,  csr_hosts;

app.get('/cert', userAuth, (req, res) => {
	
	res.status(200).json({"csr_country":csr_country,"csr_state":csr_state,"csr_locality":csr_locality,"csr_organization":csr_organization,"csr_org_unit":csr_org_unit,"csr_hosts":csr_hosts});
});



app.get('/info', userAuth, (req, res) => {
  let info = [];
  if (fs.existsSync(__dirname+"/config/info.json"))
    info = JSON.parse(fs.readFileSync(__dirname+"/config/info.json", { encoding: 'utf8', flag: 'r' }));	
    
	res.status(200).json({ "result": info, "success": true });
});

app.get('/readings', userAuth, (req, res) => {
  let readings = [];
  if (fs.existsSync(__dirname+"/config/readings.json"))
    readings = JSON.parse(fs.readFileSync(__dirname+"/config/readings.json", { encoding: 'utf8', flag: 'r' }));	
    
	res.status(200).json({ "result": readings, "success": true });
});

app.get('/reports', userAuth, (req, res) => {
  let reports = [];
  if (fs.existsSync(__dirname+"/config/reports.json"))
    reports = JSON.parse(fs.readFileSync(__dirname+"/config/reports.json", { encoding: 'utf8', flag: 'r' }));	
    
	res.status(200).json({ "result": reports, "success": true });
});


app.post('/network', userAuth, (req, res) => {
  // Check if request is json format
  if (req.is('application/json')) {

	
	let network = req.body;
 
 // Store info organizations
  let info = [];
  if (fs.existsSync(__dirname+"/config/info.json"))
    info = JSON.parse(fs.readFileSync(__dirname+"/config/info.json", { encoding: 'utf8', flag: 'r' }));

  
  let new_info = info.concat(network.info);
  
  fs.writeFileSync(__dirname+"/config/info.json", JSON.stringify(new_info) , 'utf-8');

  // Store readings organizations
  let readings = [];
  if (fs.existsSync(__dirname+"/config/readings.json"))
    readings = JSON.parse(fs.readFileSync(__dirname+"/config/readings.json", { encoding: 'utf8', flag: 'r' }));

  
  let new_readings = readings.concat(network.readings);
  
  fs.writeFileSync(__dirname+"/config/readings.json", JSON.stringify(new_readings) , 'utf-8');
  
  // Store reports organizations
  let reports = [];
  if (fs.existsSync(__dirname+"/config/reports.json"))
    reports = JSON.parse(fs.readFileSync(__dirname+"/config/reports.json", { encoding: 'utf8', flag: 'r' }));

  
  let new_reports = reports.concat(network.reports);
  
  fs.writeFileSync(__dirname+"/config/reports.json", JSON.stringify(new_reports) , 'utf-8');  
  
  const folder = base64_encode(crypto.randomBytes(18));
  if (!fs.existsSync(__dirname+"/public/get/"+folder)){
      fs.mkdirSync(__dirname+"/public/get/"+folder);
  }    
  
	res.status(200).json({ "result": {"token":"test"}, "success": true });
 
	
  }
  else {
	res.status(400).json({ "result": "JSON syntax error!", "success": false });
  }	
});







// Read user input from terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

// Ask user for input
const question = (question) => {
  return new Promise((resolve, reject) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}



const main = async () => {

	// Create config.json if not exists
	if (!fs.existsSync(__dirname+"/config/config.json")) {
  
		console.log('Provide certificate info');
		let config_json = {};
		config_json["C"] = await question('Country (C): ');
		config_json["ST"] = await question('State (ST): ');
		config_json["L"] = await question('Locality (L): ');
		config_json["O"] = await question('Organization (O): ');
		config_json["OU"] = await question('Organizational Unit (OU): ');
		config_json["HOST"] = await question('Host: ');
		
		fs.writeFileSync(__dirname+"/config/config.json", JSON.stringify(config_json) , 'utf-8');
	}
	rl.close()

	// Read config.json
	const config = JSON.parse(fs.readFileSync(__dirname+"/config/config.json", { encoding: 'utf8', flag: 'r' }));
	csr_country = config["C"], csr_state = config["ST"], csr_locality = config["L"], csr_organization = config["O"], csr_org_unit = config["OU"], csr_hosts = config["HOST"];
	
	// Start a https server
	const srvr = https
	  .createServer(
	// Provide the private and public key to the server by reading each
	// file's content with the readFileSync() method.
    {
      key: fs.readFileSync(__dirname+"/key.pem"),
      cert: fs.readFileSync(__dirname+"/cert.pem"),
    },
	app)
	  .listen(3000, csr_hosts, () => {
		console.log("Server listening on https://admin:"+server_pass+"@"+csr_hosts+":3000/");
	});
	  
	srvr.on('error', function (e) {
	  // Error handler
	  console.log("Error: Permission denied "+csr_hosts+":3000");
	  console.log("Is this domain ("+csr_hosts+") right?");
	  console.log("Is this port (3000) available?");
	  return process.exit(1);
	});	

	
 if (!fs.existsSync(__dirname+"/server/tls_ica") || !fs.existsSync(__dirname+"/server/ica")) {

  	path_structure();
  
  	let tls_ca_pass = base64_encode(crypto.randomBytes(18));
  	let tls_ica_pass = base64_encode(crypto.randomBytes(18));
  	let ca_pass = base64_encode(crypto.randomBytes(18));
  	let ica_pass = base64_encode(crypto.randomBytes(18));
  	
  	create_ca_config_file('tls_ca', csr_country, csr_state, csr_locality, csr_organization, csr_org_unit, csr_hosts, tls_ca_pass);
  	create_ca_config_file('ca', csr_country, csr_state, csr_locality, csr_organization, csr_org_unit, csr_hosts, ca_pass);
  
   	create_ca_config_file('tls_ica', csr_country, csr_state, csr_locality, csr_organization, csr_org_unit, csr_hosts, tls_ica_pass);
  	create_ca_config_file('ica', csr_country, csr_state, csr_locality, csr_organization, csr_org_unit, csr_hosts, ica_pass);
      
    create_tls_ca(tls_ca_pass, tls_ica_pass, csr_hosts);
    create_tls_ica(tls_ica_pass, ca_pass, ica_pass, csr_hosts);
    
    create_ca(ca_pass, ica_pass, csr_hosts);
    create_ica(ica_pass, csr_hosts);
  
  }
}

main()







// base64url "safe"
function base64_encode(buffer) {

  return buffer.toString('base64')
    .replace(/\+/g, '-') // Convert '+' to '-'
    .replace(/\//g, '_') // Convert '/' to '_'
    .replace(/=+$/, ''); // Remove ending '='

}

// Create path structure
function path_structure() {

	if (!fs.existsSync(__dirname+"/public/get")){
		fs.mkdirSync(__dirname+"/public/get", { recursive: true });
	}
 
	if (!fs.existsSync(__dirname+"/server/tls_ca")){
		fs.mkdirSync(__dirname+"/server/tls_ca", { recursive: true });
	}
	if (!fs.existsSync(__dirname+"/server/tls_ica")){
		fs.mkdirSync(__dirname+"/server/tls_ica", { recursive: true });
	}
	if (!fs.existsSync(__dirname+"/server/ca")){
		fs.mkdirSync(__dirname+"/server/ca", { recursive: true });
	}
	if (!fs.existsSync(__dirname+"/server/ica")){
		fs.mkdirSync(__dirname+"/server/ica", { recursive: true });
	}	
}

// Read CA config yaml file, replace with given values and save it
function create_ca_config_file(file, csr_country, csr_state, csr_locality, csr_organization, csr_org_unit, csr_hosts, identity_pass) {
	let file_data = fs.readFileSync(__dirname+"/config/"+file+"/fabric-ca-server-config.yaml", { encoding: 'utf8', flag: 'r' });
	file_data = file_data.replace(/<<identity_pass>>/g, identity_pass);
	file_data = file_data.replace(/<<csr_country>>/g, csr_country);
	file_data = file_data.replace(/<<csr_state>>/g, csr_state);
	file_data = file_data.replace(/<<csr_locality>>/g, csr_locality);
	file_data = file_data.replace(/<<csr_organization>>/g, csr_organization);
	file_data = file_data.replace(/<<csr_org_unit>>/g, csr_org_unit);
	file_data = file_data.replace(/<<csr_hosts>>/g, csr_hosts);

	fs.writeFileSync(__dirname+"/server/"+file+"/fabric-ca-server-config.yaml", file_data , 'utf-8');
}



function clean() {
  try {
    execSync('sh '+__dirname+'/clean.sh');
     
  }
  catch (e){ 
  
    console.log("execSync error.");
    return process.exit(7); 
  }

}


function create_tls_ca(tls_ca_pass, tls_ica_pass, host) {
  // Start TLS CA server
  try {
    execSync('cd '+__dirname+'/server/tls_ca/ && export FABRIC_CA_SERVER_HOME=$PWD && fabric-ca-server start 2> $FABRIC_CA_SERVER_HOME/server.log &', { stdio: 'inherit' });
     
  }
  catch (e){ 
  
    console.log("execSync error.");
    return process.exit(7); 
  }

  // Enroll tls_ca admin user
  try {
    execSync('sleep 3 && cd '+__dirname+'/server/tls_ca/ && export FABRIC_CA_CLIENT_HOME=$PWD && fabric-ca-client enroll -u https://tls-ca:'+tls_ca_pass+'@'+host+':7054 --tls.certfiles '+__dirname+'/server/tls_ca/ca-cert.pem --enrollment.profile tls --mspdir '+__dirname+'/server/client/tls-ca/tls-ca/msp');
     
  }
  catch (e){ 
  
    console.log("execSync error.");
    return process.exit(7); 
  }
  
  // Register TLS Intermediate CA identity  
  try {
    
    execSync('fabric-ca-client register -u https://'+host+':7054 --id.name tls-ica --id.secret '+tls_ica_pass+' --id.attrs \'"hf.Registrar.Roles=user,admin","hf.Revoker=true","hf.IntermediateCA=true"\' --tls.certfiles '+__dirname+'/server/tls_ca/ca-cert.pem --mspdir '+__dirname+'/server/client/tls-ca/tls-ca/msp --enrollment.profile tls');      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  


}


function create_tls_ica(tls_ica_pass, ca_pass, ica_pass, host) {
  // Enroll TLS Intermediate CA identity  
  try {
    
    execSync("HOSTS='localhost,'"+host+" && fabric-ca-client enroll -u https://tls-ica:"+tls_ica_pass+"@"+host+":7054 --tls.certfiles "+__dirname+"/server/tls_ca/ca-cert.pem --enrollment.profile tls --csr.hosts $HOSTS --mspdir "+__dirname+"/server/client/tls-ca/tls-ica/msp && mv "+__dirname+"/server/client/tls-ca/tls-ica/msp/keystore/`ls -A "+__dirname+"/server/client/tls-ca/tls-ica/msp/keystore/` "+__dirname+"/server/client/tls-ca/tls-ica/msp/keystore/key.pem");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  
  



  // Copy TLS Intermediate CA MSP  
  try {
    
    execSync("cd "+__dirname+"/server/tls_ica && mkdir tls && cp "+__dirname+"/server/client/tls-ca/tls-ica/msp/signcerts/cert.pem tls && cp "+__dirname+"/server/client/tls-ca/tls-ica/msp/keystore/key.pem tls && cp "+__dirname+"/server/tls_ca/ca-cert.pem tls/tls-ca-cert.pem");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  


  // Start TLS Intermediate CA  
  try {
    
    execSync("cd "+__dirname+"/server/tls_ica && export FABRIC_CA_SERVER_HOME=$PWD && fabric-ca-server start 2> $FABRIC_CA_SERVER_HOME/server.log &", { stdio: 'inherit' });      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  

  // Enroll TLS Intermediate CA admin user  
  try {
    
    execSync("sleep 3 && HOSTS='localhost,'"+host+" && fabric-ca-client enroll -u https://tls-ica:"+tls_ica_pass+"@"+host+":7052 --csr.hosts $HOSTS --tls.certfiles "+__dirname+"/server/tls_ca/ca-cert.pem --mspdir "+__dirname+"/server/client/tls-ica/tls-ica/msp");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  


    try {
      // Register ORG CA identity
      execSync('fabric-ca-client register --id.name ca --id.secret '+ca_pass+' -u https://'+host+':7052 --tls.certfiles '+__dirname+'/server/tls_ca/ca-cert.pem --mspdir '+__dirname+'/server/client/tls-ica/tls-ica/msp');        
       

    }
    catch (e){ 
    
      console.log("execSync error.");
      return process.exit(7); 
    } 

    try {
      // Register ORG Intermediate CA identity
      execSync('fabric-ca-client register --id.name ica --id.secret '+ica_pass+' -u https://'+host+':7052 --tls.certfiles '+__dirname+'/server/tls_ca/ca-cert.pem --mspdir '+__dirname+'/server/client/tls-ica/tls-ica/msp');
              

    }
    catch (e){ 
    
      console.log("execSync error.");
      return process.exit(7); 
    }
}


function create_ca(ca_pass, ica_pass, host) {
  // Enroll CA identity  
  try {
    
    execSync("HOSTS='localhost,'"+host+" && fabric-ca-client enroll -u https://ca:"+ca_pass+"@"+host+":7052 --tls.certfiles "+__dirname+"/server/tls_ca/ca-cert.pem --enrollment.profile tls --csr.hosts $HOSTS --mspdir "+__dirname+"/server/client/tls-ica/ca/msp && mv "+__dirname+"/server/client/tls-ica/ca/msp/keystore/`ls -A "+__dirname+"/server/client/tls-ica/ca/msp/keystore/` "+__dirname+"/server/client/tls-ica/ca/msp/keystore/key.pem");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  
  
  // Copy CA MSP  
  try {
    
    execSync("cd "+__dirname+"/server/ca && mkdir tls && cp "+__dirname+"/server/client/tls-ica/ca/msp/signcerts/cert.pem tls && cp "+__dirname+"/server/client/tls-ica/ca/msp/keystore/key.pem tls && cp "+__dirname+"/server/tls_ca/ca-cert.pem tls/tls-ca-cert.pem");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  
  
  // Start CA  
  try {
    
    execSync("cd "+__dirname+"/server/ca && export FABRIC_CA_SERVER_HOME=$PWD && fabric-ca-server start 2> $FABRIC_CA_SERVER_HOME/server.log &", { stdio: 'inherit' });      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }    
  
  // Enroll CA admin user  
  try {
    
    execSync("sleep 3 && HOSTS='localhost,'"+host+" && fabric-ca-client enroll -u https://ca:"+ca_pass+"@"+host+":7056 --csr.hosts $HOSTS --tls.certfiles "+__dirname+"/server/tls_ica/ca-cert.pem --mspdir "+__dirname+"/server/client/ca/ca/msp");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  } 
  
    try {
      // Register ORG Intermediate CA identity
    execSync('fabric-ca-client register -u https://'+host+':7056 --id.name ica --id.secret '+ica_pass+' --id.attrs \'"hf.Registrar.Roles=user,admin","hf.Revoker=true","hf.IntermediateCA=true"\' --tls.certfiles '+__dirname+'/server/tls_ica/ca-cert.pem --mspdir '+__dirname+'/server/client/ca/ca/msp');   
    }
    catch (e){ 
    
      console.log("execSync error.");
      return process.exit(7); 
    }  
      

}


function create_ica(ica_pass, host) {
  // Enroll Intermediate CA identity (TLS)
  try {
    
    execSync("HOSTS='localhost,'"+host+" && fabric-ca-client enroll -u https://ica:"+ica_pass+"@"+host+":7052 --tls.certfiles "+__dirname+"/server/tls_ca/ca-cert.pem --enrollment.profile tls --csr.hosts $HOSTS --mspdir "+__dirname+"/server/client/tls-ica/ica/msp && mv "+__dirname+"/server/client/tls-ica/ica/msp/keystore/`ls -A "+__dirname+"/server/client/tls-ica/ica/msp/keystore/` "+__dirname+"/server/client/tls-ica/ica/msp/keystore/key.pem");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }  
  
  // Copy Intermediate CA MSP (TLS)
  try {
    
    execSync("cd "+__dirname+"/server/ica && mkdir tls && cp "+__dirname+"/server/client/tls-ica/ica/msp/signcerts/cert.pem tls && cp "+__dirname+"/server/client/tls-ica/ica/msp/keystore/key.pem tls && cp "+__dirname+"/server/tls_ica/ca-cert.pem tls/tls-ca-cert.pem");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }
  
  // Enroll Intermediate CA identity  
  try {
    
    execSync("HOSTS='localhost,'"+host+" && fabric-ca-client enroll -u https://ica:"+ica_pass+"@"+host+":7056 --tls.certfiles "+__dirname+"/server/tls_ica/ca-cert.pem --enrollment.profile tls --csr.hosts $HOSTS --mspdir "+__dirname+"/server/client/ca/ica/msp && mv "+__dirname+"/server/client/ca/ica/msp/keystore/`ls -A "+__dirname+"/server/client/ca/ica/msp/keystore/` "+__dirname+"/server/client/ca/ica/msp/keystore/key.pem");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }      
  
  
  // Start Intermediate CA  
  try {
    
    execSync("cd "+__dirname+"/server/ica && export FABRIC_CA_SERVER_HOME=$PWD && fabric-ca-server start 2> $FABRIC_CA_SERVER_HOME/server.log &", { stdio: 'inherit' });      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  }    
  
  // Enroll Intermediate CA admin user  
  try {
    
    execSync("sleep 3 && HOSTS='localhost,'"+host+" && fabric-ca-client enroll -u https://ica:"+ica_pass+"@"+host+":7058 --csr.hosts $HOSTS --tls.certfiles "+__dirname+"/server/tls_ica/ca-cert.pem --mspdir "+__dirname+"/server/client/ica/ica/msp");      
     
  }
  catch (e){
  
    console.log("execSync error.");
    return process.exit(7); 
  } 
  

      

}

