import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const sendSMS = async (mobile: string, message: string) => {
    try {
        const token = process.env.SMS_API_TOKEN;
        const apiUrl = process.env.SMS_API_URL;

        if (!token || !apiUrl) {
            console.warn('SMS API not configured in .env. Skipping SMS push.');
            return false;
        }

        // Clean mobile number - format to 10 digits assuming Sri Lankan numbers
        // e.g. +94775533590 -> 0775533590
        let cleanMobile = mobile.replace(/\D/g, '');
        if (cleanMobile.startsWith('94')) {
            cleanMobile = '0' + cleanMobile.substring(2);
        }

        const data = JSON.stringify({
            mobile: cleanMobile,
            message: message,
            token: token
        });

        const config = {
            method: 'post',
            url: apiUrl,
            headers: { 
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios(config);
        console.log(`[SMS] Sent to ${cleanMobile}:`, response.data);
        return true;
    } catch (error) {
        console.error('[SMS] Failed to send SMS:', error);
        return false;
    }
};
