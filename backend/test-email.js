const validate = require('deep-email-validator');

async function check() {
    console.log("Checking harsh@gmail.com...");
    const res1 = await validate.validate('harsh@gmail.com');
    console.log(res1);

    console.log("Checking harshfk05@gmail.com...");
    const res2 = await validate.validate('harshfk05@gmail.com');
    console.log(res2);
}

check();
