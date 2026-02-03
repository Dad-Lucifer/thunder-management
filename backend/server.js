const app = require("./src/index");
const { startBookingScheduler } = require("./src/services/bookingScheduler");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);

    // Start automatic booking conversion scheduler
    startBookingScheduler();
});