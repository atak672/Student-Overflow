# Student Overflow

A locally hosted web application that supports **Student Overflow**, a peer-led tutoring group aimed at addressing the overcrowding in computer science departments. Originally developed as a website, my code has since been repurposed into a **Discord server** for streamlined student and tutor interactions.

This project provides a platform for students and tutors to connect in real time during designated office hours. Users are able to join queues based on course requirements, while tutors can monitor and assist students through Zoom links or similar means. The original website has been converted to a locally hosted version included in this repository.

## Video Tour

[![Student Overflow Tour](https://img.youtube.com/vi/bdgnhDnColE/0.jpg)](https://youtu.be/bdgnhDnColE)

**Please click above to see a quick video tour**

## Features

- **Queue System**: Students can join a queue for specific courses, view their position, and receive Zoom links from tutors when admitted.
- **Role-Based Access**: Users are classified as students or tutors, with tutors granted additional permissions to manage office hours, clear queues, and assist students.
- **Office Hours Management**: Tutors can toggle office hours on/off, clearing the queue and updating session status in real time.
- **Email Contact**: Students can contact the **Student Overflow** team through a contact form that uses Nodemailer for email communication.

## Recreation Steps

Ensure the following dependencies are installed to run locally:
- **Node.js**
- **Express**
- **body-parser** 
- **express-session** 
- **nodemailer** 

Simply point to the project directory locally, run **node server.js**, and open your browser to your local host (e.g., http://localhost:3000) to access the application.