require("dotenv").config();

const dns =
    require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

const mongoose =
    require("mongoose");

const bcrypt =
    require("bcryptjs");

const User =
    require("../models/User");


const seedAdmin =
    async () => {

        try {

            await mongoose.connect(
                process.env.MONGO_URL
            );


            console.log(
                "Connected to MongoDB"
            );


            const existingAdmin =
                await User.findOne({

                    userId:
                        process.env.ADMIN_USER_ID

                });


            if (existingAdmin) {

                console.log(
                    "Admin already exists"
                );

                process.exit(0);

            }


            const passwordHash =
                await bcrypt.hash(

                    process.env.ADMIN_PASSWORD,

                    10

                );


            const admin =
                await User.create({

                    userId:
                        process.env.ADMIN_USER_ID,

                    passwordHash,

                    role:
                        "ADMIN",

                    accountStatus:
                        "APPROVED",

                    firstName:
                        "System",

                    lastName:
                        "Administrator",

                    email:
                        process.env.ADMIN_EMAIL,

                    mobileNumber:
                        ""

                });


            console.log(
                "Admin created successfully"
            );

            console.log(
                "User ID:",
                admin.userId
            );


            process.exit(0);

        } catch (error) {

            console.error(
                "Admin seed failed:",
                error
            );

            process.exit(1);

        }

    };


seedAdmin();