import { db } from '../firebaseConfig';
import { query, where, getDocs, collection } from "firebase/firestore";

const checkTicketValidity = async (organiserId, eventId, ticketBarcode) => {
  try {
    const ticketsCollectionRef = collection(db, 'organiser', organiserId, 'events', eventId, 'tickets');
    const ticketsQuery = query(
      ticketsCollectionRef,
      where('ticketBarcode', '==', ticketBarcode)
    );

    const querySnapshot = await getDocs(ticketsQuery);

    if (querySnapshot.empty) {
      return { valid: false, message: 'Ticket not found' };
    }

    const ticketData = querySnapshot.docs[0].data();
    const ticketId = querySnapshot.docs[0].id;

    return { valid: true, ticket: ticketData, ticketId: ticketId };
  } catch (error) {
    console.error('Error checking ticket validity:', error);
    return { valid: false, message: 'Error checking ticket validity' };
  }
};

export default checkTicketValidity;
