console.log('Testing "".split(","):');
console.log("".split(','));
console.log("Length:", "".split(',').length);

const ids = "".split(',').filter(Boolean);
console.log('With filter(Boolean):');
console.log(ids);
console.log("Length:", ids.length);
