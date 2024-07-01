import React, { useState, useEffect } from 'react';
import { Button, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { updateDoc, doc } from 'firebase/firestore';
import checkTicketValidity from './firebase/ticketValidation';
import { db } from './firebaseConfig'; // Adjust this path as per your actual configuration

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [barcodeScanned, setBarcodeScanned] = useState(false);
  const [eventId, setEventId] = useState('VxkSFugo3Z51t4rGTqm3');
  const [orgId, selectedOrgId] = useState('n9V7Ec7k7fRTJaTqWjJmY0XcoTm2');
  const [ticketDetails, setTicketDetails] = useState({});
  const [isValidTicket, setIsValidTicket] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [scanResult, setScanResult] = useState(''); // 'valid', 'invalid', 'alreadyScanned'
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [showConfirmButton, setShowConfirmButton] = useState(false);

  const CAM_VIEW_WIDTH = Dimensions.get('window').width;
  const CAM_VIEW_HEIGHT = Dimensions.get('window').height;

  const leftMargin = 50;
  const topMargin = 150;
  const frameWidth = 300;
  const frameHeight = 100;

  // Calculate rectOfInterest based on screen dimensions and desired scanning area
  const rectOfInterest = {
    x: topMargin / CAM_VIEW_WIDTH,
    y: leftMargin / CAM_VIEW_HEIGHT,
    width: frameHeight / CAM_VIEW_WIDTH,
    height: frameWidth / CAM_VIEW_HEIGHT,
  };

  useEffect(() => {
    if (ticketDetails.status === 'scanned') {
      setScanResult('alreadyScanned');
      setShowConfirmButton(true);
      setIsValidTicket(false); // Ensure isValidTicket is false when already scanned
    } else if (ticketDetails.status === 'sold' && ticketId) {
      setScanResult('valid');
      setShowConfirmButton(true);
      setIsValidTicket(true);
      updateTicketStatus();
    }
  }, [ticketDetails]);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleScanBarcode = async (data) => {
    setBarcodeScanned(true);
    const result = await checkTicketValidity(orgId, eventId, data.data);
    if (result.valid) {
      setTicketId(result.ticketId);
      setTicketDetails(result.ticket);
      setIsValidTicket(true);
      if (result.ticket.status === 'sold') {
        setScanResult('valid');
        setShowRetryButton(false);
        setShowConfirmButton(true);
        console.log('Ticket Valid', `Ticket details: ${JSON.stringify(result.ticket)}`);
      } else if (result.ticket.status === 'scanned') {
        setScanResult('alreadyScanned');
        setShowRetryButton(false);
        setShowConfirmButton(true);
        console.log('Ticket Invalid', 'Ticket already scanned');
      }
    } else {
      setTicketDetails({ message: result.message });
      setIsValidTicket(false);
      setScanResult('invalid');
      setShowRetryButton(true);
      setShowConfirmButton(false);
      console.log('Ticket Invalid', result.message);
    }
  };

  const acknowledgeTicket = () => {
    setBarcodeScanned(false);
    setTicketId('');
    setTicketDetails({});
    setIsValidTicket(false);
    setShowRetryButton(false);
    setShowConfirmButton(false);
    setScanResult('');
  };

  const updateTicketStatus = async () => {
    try {
      const ticketRef = doc(db, 'organiser', orgId, 'events', eventId, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'scanned',
      });
      console.log('Ticket status updated successfully to "scanned"');
    } catch (error) {
      console.error('Error updating ticket status:', error.message);
    }
  };

  const handleRetry = () => {
    setBarcodeScanned(false);
    setTicketId('');
    setTicketDetails({});
    setIsValidTicket(false);
    setShowRetryButton(false);
    setShowConfirmButton(false);
    setScanResult('');
  };

  const handleAllowEntry = () => {
    // Implement entry allowance logic here (e.g., navigate to entry screen)
    console.log('Allow Entry');
    acknowledgeTicket(); // Reset state after allowing entry
  };

  const handleConfirm = () => {
    setBarcodeScanned(false);
    setTicketId('');
    setTicketDetails({});
    setIsValidTicket(false);
    setShowRetryButton(false);
    setShowConfirmButton(false);
    setScanResult('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusBox, { backgroundColor: scanResult === 'valid' ? 'green' : barcodeScanned ? 'red' : 'white' }]}>
        <Text style={scanResult ? styles.statusTextShow : styles.statusTextHide}>
          {scanResult === 'valid' ? 'VALID' : scanResult === 'invalid' ? 'Failure' : 'INVALID' }
        </Text>
      </View>
      {!barcodeScanned ? (
        <View style={styles.cameraContainer}>
          <CameraView
            barcodeScannerSettings={{
              barcodeTypes: ['code128'],
              rectOfInterest: rectOfInterest,
            }}
            cameraViewDimensions={{
              width: CAM_VIEW_WIDTH,
              height: CAM_VIEW_HEIGHT,
            }}
            onBarcodeScanned={(data) => handleScanBarcode(data)}
            style={styles.camera}
          />
          <View style={styles.mask}>
            <View style={styles.maskTop}>
              <Text style={styles.topText}>Ticket Scanner</Text>
            </View>
            <View style={styles.maskCenter}>
              <View style={styles.maskSide} />
              <View style={styles.cameraView} />
              <View style={styles.maskSide} />
            </View>
            <View style={styles.maskBottom}>
              <Text style={styles.bottomText}>Align the ticket barcode within the frame to scan</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          {scanResult === 'valid' && isValidTicket && (
            <>
              <Text style={styles.title}>SCANNED!</Text>
              <Text style={styles.text}>Owned By: {ticketDetails.ownedBy}</Text>
              <Text style={styles.text}>Type: {ticketDetails.type}</Text>
              <Text style={styles.text}>Price: {ticketDetails.price}</Text>
              <Text style={styles.text}>Ticket Number: {ticketDetails.ticketNumber}</Text>
              <TouchableOpacity style={styles.allowEntryButton} onPress={handleAllowEntry}>
                <Text style={styles.allowEntryButtonText}>Approve Entry</Text>
              </TouchableOpacity>
            </>
          )}
          {scanResult === 'invalid' && (
            <>
              <Text style={styles.title}>INVALID TICKET</Text>
              <Text style={styles.text}>{ticketDetails.message}</Text>
              {showRetryButton && (
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {scanResult === 'alreadyScanned' && (
            <>
              <Text style={styles.title}>INVALID</Text>
              <Text style={styles.text}>Ticket has already been used</Text>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskCenter: {
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  cameraView: {
    width: '100%',
    height: 100,
  },
  maskBottom: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  bottomText: {
    fontSize: 16,
    color: 'white',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#FF0000',
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  confirmButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#FF0000',
    borderRadius: 25,
  },
  confirmButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  allowEntryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: 'green',
    borderRadius: 25,
  },
  allowEntryButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  statusBox: {
    width: '100%',
    padding: 5,
    alignItems: 'center',
    backgroundColor: 'white'
  },
  statusTextHide: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statusTextShow: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 50,
  },
});
