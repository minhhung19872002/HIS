const net = require('net');
const client = new net.Socket();

const VT = String.fromCharCode(0x0B);
const FS = String.fromCharCode(0x1C);
const CR = String.fromCharCode(0x0D);

const hl7Message =
    'MSH|^~\\&|HL7SPY|ANALYZER|HIS|HOSPITAL|20260212160000||ORU^R01|MSG003|P|2.5\r' +
    'PID|1||BN202602010004^^^MRN||Test^Patient||19800101|M\r' +
    'OBR|1|ORD001|LIS260212E8ED|GLU^Glucose|||20260212160000\r' +
    'OBX|1|NM|GLU^Glucose||102.3|mg/dL|70-100|H|||F\r' +
    'OBX|2|NM|HBA1C^HbA1c||6.5|%|4.0-6.0|H|||F';

const mlppMessage = VT + hl7Message + FS + CR;

client.connect(2576, '127.0.0.1', () => {
    console.log('Connected to HL7 server');
    client.write(mlppMessage);
    console.log('Sent HL7 message');
});

client.on('data', (data) => {
    console.log('ACK received:', data.toString());
    client.destroy();
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (err) => {
    console.error('Error:', err.message);
});

setTimeout(() => {
    console.log('Timeout - closing connection');
    client.destroy();
}, 5000);
