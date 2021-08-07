/* eslint-disable max-len */
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");
const admin = require("firebase-admin");
const unirest = require("unirest");
const req = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");

admin.initializeApp(functions.config().firebase);

// Send an email to user on registering for an event
exports.sendEmailOnRegistration = functions.firestore
    .document("participations/{userId}")
    .onCreate((snap, context) => {
      sgMail.setApiKey(functions.config().emailsmtp.key);
      const participationDetails = snap.data();
      const userEmail = participationDetails.userObj.email;
      const userName = participationDetails.userObj.f_name;
      const msg = {
        to: userEmail, // Change to your recipient
        from: "theartcoliseumofficial@gmail.com", // Change to your verified sender
        subject: "Registration Recieved",
        html: `<h4>Dear ${userName}</h4><br /><p>Your Registration for the event has been recieved. Please await our confirmation on your audition acceptance to move forward with your participation.</p><br /><h4>Regards,</h<br /><h4><strong>The Art Coliseum Team</strong></h4>`,
      };
      sgMail
          .send(msg)
          .then(() => {
            console.log("Email sent");
          })
          .catch((error) => {
            console.error(error);
          });
    });

// Send an email to user on rejection
exports.sendEmailOnRejection = functions.firestore
    .document("participations/{userId}")
    .onUpdate((change, context) => {
      sgMail.setApiKey(functions.config().emailsmtp.key);
      const newValue = change.after.data();

      // ...or the previous value before this update
      const previousValue = change.before.data();
      const userEmail = newValue.userObj.email;
      const userName = newValue.userObj.f_name;

      if (previousValue.status !== "REJECTED" && newValue.status === "REJECTED") {
        const msg = {
          to: userEmail, // Change to your recipient
          from: "theartcoliseumofficial@gmail.com", // Change to your verified sender
          subject: "Registration Rejected",
          html: `<h4>Dear ${userName}</h4><br /><p>Your Registration for the event has been rejected for the reason. You can still join the event as an audience. We look forward to your active participation in our future events.</p><br /><h4>Regards,</h<br /><h4><strong>The Art Coliseum Team</strong></h4>`,
        };
        sgMail
            .send(msg)
            .then(() => {
              console.log("Email sent");
            })
            .catch((error) => {
              console.error(error);
            });
      }
    });

// Send an email to user on acceptance of audition
exports.sendEmailOnAcceptance = functions.firestore
    .document("participations/{userId}")
    .onUpdate((change, context) => {
      sgMail.setApiKey(functions.config().emailsmtp.key);
      const newValue = change.after.data();

      // ...or the previous value before this update
      const previousValue = change.before.data();
      const userEmail = newValue.userObj.email;
      const userName = newValue.userObj.f_name;

      if (previousValue.status !== "AUDITION_ACCEPTED" && newValue.status === "AUDITION_ACCEPTED") {
        const msg = {
          to: userEmail, // Change to your recipient
          from: "theartcoliseumofficial@gmail.com", // Change to your verified sender
          subject: "Audition Accepted",
          html: `<h4>Dear ${userName}</h4><br /><p>Congratulation! Your audition has been accepted.</p><br /><h4>Regards,</h<br /><h4><strong>The Art Coliseum Team</strong></h4>`,
        };
        sgMail
            .send(msg)
            .then(() => {
              console.log("Email sent");
            })
            .catch((error) => {
              console.error(error);
            });
      }
    });

exports.sendInviteToParticipants = functions.pubsub
    // .schedule("18 23 * * SAT")
    .schedule("0 20 * * SAT")
    .timeZone("Asia/Kolkata")
    .onRun((context) => {
      console.log("CRON Job For Participants initiated!");
      // return null;
      sgMail.setApiKey(functions.config().emailsmtp.key);
      const db = admin.firestore();
      // Get All Events Scheduled for Tomorrow
      const today = new Date();
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      return db.collection("events").where("e_date", ">=", today).where("e_date", "<=", dayAfter)
          .get().then((snapshot) => {
            snapshot.forEach((doc) => {
              const eventId = doc.id;
              console.log(`Event Id: ${eventId}`);
              const event = doc.data();
              event.participant = [];
              return db.collection("participations").where("event", "==", `/events/${eventId}`).get().then((participants) => {
                const meetingLink = event.emeeting_link;
                const mobNos = [];
                participants.forEach(function(doci) {
                  const participantData = doci.data();
                  if (participantData.status) {
                    const participantEmail = participantData.userObj.email;
                    const userName = participantData.userObj.f_name;
                    const userMobile = participantData.userObj.mobile;
                    mobNos.push(userMobile);
                    console.log(`User Name: ${userName}`);
                    const msg = {
                      to: participantEmail, // Change to your recipient
                      from: "theartcoliseumofficial@gmail.com", // Change to your verified sender
                      subject: "Event Invite",
                      html: `<h4>Dear ${userName}</h4><br /><p>Please find the meeting invite below for the event: <br /> ${meetingLink} <br />Please join on time.</p><br /><h4>Regards,</h<br /><h4><strong>The Art Coliseum Team</strong></h4>`,
                    };
                    sgMail
                        .send(msg)
                        .then(() => {
                          console.log("Email sent");
                        })
                        .catch((error) => {
                          console.error(error);
                        });
                  }
                });
                console.log(`Mob Nos: ${mobNos.join(",")}`);
                req.query({
                  "authorization": "Oz8RwyHNjAhB4po9SirGmVIKlqdFvf75nE2CP0XQecaUgktJu6i7gb4cmFKJUAlesWwkT3SVEGaYQNO9",
                  "message": `Thank you for registering with THE ART COLISEUM.
                  Kindly check your email for more info
                  Join tomorrow at 6:45 pm on Zoom using this link
                  ${meetingLink}`,
                  "language": "english",
                  "route": "v3",
                  "numbers": mobNos.join(","),
                });

                req.headers({
                  "cache-control": "no-cache",
                });
                req.end(function(res) {
                  if (res.error) throw new Error(res.error);

                  console.log(res.body);
                });
              }).catch((error) => {
                console.log(error);
              });
            });
          }).catch((error) => {
            console.log(error);
          });
    });

exports.sendInviteToAudience = functions.pubsub
    // .schedule("18 23 * * SAT")
    .schedule("0 10 * * SUN")
    .timeZone("Asia/Kolkata")
    .onRun((context) => {
      console.log("CRON Job For Audience initiated!");
      // return null;
      sgMail.setApiKey(functions.config().emailsmtp.key);
      const db = admin.firestore();
      // Get All Events Scheduled for Tomorrow
      const today = new Date();
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      return db.collection("events").where("e_date", ">=", today).where("e_date", "<=", dayAfter)
          .get().then((snapshot) => {
            snapshot.forEach((doc) => {
              const eventId = doc.id;
              console.log(`Event Id: ${eventId}`);
              const event = doc.data();
              event.participant = [];
              return db.collection("audience").where("event", "==", `/events/${eventId}`).get().then((participants) => {
                const meetingLink = event.emeeting_link;
                const mobNos = [];
                participants.forEach(function(doci) {
                  const participantData = doci.data();
                  if (participantData.status) {
                    const participantEmail = participantData.userObj.email;
                    const userName = participantData.userObj.f_name;
                    const userMobile = participantData.userObj.mobile;
                    mobNos.push(userMobile);
                    console.log(`User Name: ${userName}`);
                    const msg = {
                      to: participantEmail, // Change to your recipient
                      from: "theartcoliseumofficial@gmail.com", // Change to your verified sender
                      subject: "Event Invite",
                      html: `<h4>Dear ${userName}</h4><br /><p>Please find the meeting invite below for the event: <br /> ${meetingLink} <br />Please join on time.</p><br /><h4>Regards,</h<br /><h4><strong>The Art Coliseum Team</strong></h4>`,
                    };
                    sgMail
                        .send(msg)
                        .then(() => {
                          console.log("Email sent");
                        })
                        .catch((error) => {
                          console.error(error);
                        });
                  }
                });
                console.log(`Mob Nos: ${mobNos.join(",")}`);
                req.query({
                  "authorization": "Oz8RwyHNjAhB4po9SirGmVIKlqdFvf75nE2CP0XQecaUgktJu6i7gb4cmFKJUAlesWwkT3SVEGaYQNO9",
                  "message": `Thank you for registering with THE ART COLISEUM.
                  Kindly check your email for more info
                  Join tomorrow at 6:45 pm on Zoom using this link
                  ${meetingLink}`,
                  "language": "english",
                  "route": "v3",
                  "numbers": mobNos.join(","),
                });

                req.headers({
                  "cache-control": "no-cache",
                });


                req.end(function(res) {
                  if (res.error) throw new Error(res.error);

                  console.log(res.body);
                });
              }).catch((error) => {
                console.log(error);
              });
            });
          }).catch((error) => {
            console.log(error);
          });
    });
