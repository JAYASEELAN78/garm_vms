import axios from 'axios';

async function testRegistration() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/register', {
            name: "HARISH R",
            email: "harishr.24mca@kongu.edu",
            phone: "9578016325",
            companyName: "TCS",
            gstNumber: "22AAAA0000A12H",
            companyAddress: "TCS,POLICE STREET,CHENNAI.",
            password: "password123",
            confirmPassword: "password123"
        });
        console.log("SUCCESS:", response.data);
    } catch (error) {
        if (error.response) {
            console.error("ERROR DATA:", error.response.data);
            console.error("ERROR STATUS:", error.response.status);
        } else {
            console.error("ERROR MESSAGE:", error.message);
        }
    }
}

testRegistration();
