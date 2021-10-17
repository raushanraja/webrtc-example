const decode = (data) => JSON.stringify(data);
const encode = (data) => JSON.parse(data);

const genetateClientId = ()=> {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

module.exports = {
    'decode': decode,
    'encode': encode,
    'generateClientId': genetateClientId,
}