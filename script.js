// State Helper
const state = {
    mobileNumber: '',
    otp: '1234',
    emergencyContact: {
        name: '',
        number: ''
    },
    locationSharing: {
        enabled: false,
        mode: '' // 'ONCE' or 'ALWAYS'
    }
};

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    otp: document.getElementById('otp-view'),
    emergency: document.getElementById('emergency-view'),
    dashboard: document.getElementById('dashboard-view'),
    rides: document.getElementById('rides-view')
};

const screens = ['login', 'otp', 'emergency', 'dashboard', 'rides'];

/* Navigation */
function navigateTo(viewName) {
    screens.forEach(screen => {
        const el = document.getElementById(screen + '-view');
        if (!el) return;

        if (screen === viewName) {
            el.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition
            setTimeout(() => {
                el.classList.add('active');
                if (viewName === 'dashboard' && !window.mapInitialized) {
                    initMap();
                }
                if (viewName === 'rides') {
                    renderRides();
                }
            }, 10);
        } else {
            el.classList.remove('active');
            setTimeout(() => el.classList.add('hidden'), 300); // Wait for transition
        }
    });
}

// Map Initialization
function initMap() {
    window.mapInitialized = true;
    // Marathahalli, Bangalore Coordinates
    const marathahalli = [12.9591, 77.6974];

    // Default to Marathahalli
    const map = L.map('map', {
        zoomControl: false // Move zoom control if needed to avoid UI overlap
    }).setView(marathahalli, 15);

    // Light Mode Map (OpenStreetMap Standard)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Mock User Location Marker
    const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="background-color:#6366f1;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(99, 102, 241, 0.5);"></div>',
        iconSize: [24, 24]
    });

    L.marker(marathahalli, { icon: userIcon }).addTo(map);

    // Add zoom control at top-right to avoid bottom sheet
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Invalidate size to ensure it fills container properly after transition
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Initial Navigation & Persistence Check
function checkSession() {
    const savedUser = localStorage.getItem('cabs_user');
    const savedContact = localStorage.getItem('cabs_contact');

    if (savedUser) {
        console.log('Session restored: User found');
        state.mobileNumber = savedUser;

        if (savedContact) {
            try {
                const parsedContact = JSON.parse(savedContact);
                state.emergencyContact = parsedContact;
                console.log('Session restored: Contact found, going to dashboard');
                navigateTo('dashboard');
            } catch (e) {
                console.error('Error parsing contact', e);
                navigateTo('emergency');
            }
        } else {
            console.log('Session restored: No contact, going to emergency');
            navigateTo('emergency');
        }
    } else {
        console.log('No session found, starting at login');
        navigateTo('login');
    }
}

// Start App
checkSession();

/* 1. Login Logic */
const mobileInput = document.getElementById('mobile-input');
const getOtpBtn = document.getElementById('get-otp-btn');

if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
        // Basic validation: just check length for demo
        if (e.target.value.length === 10) {
            getOtpBtn.removeAttribute('disabled');
        } else {
            getOtpBtn.setAttribute('disabled', 'true');
        }
    });

    getOtpBtn.addEventListener('click', () => {
        state.mobileNumber = mobileInput.value;
        const displayMobile = document.getElementById('display-mobile');
        if (displayMobile) displayMobile.innerText = `+91 ${state.mobileNumber}`;
        navigateTo('otp');
        console.log('OTP sent. hint: 1234');
    });
}

/* 2. OTP Logic */
const otpInput = document.getElementById('otp-input');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const backToLoginBtn = document.getElementById('back-to-login');

if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
        if (otpInput.value === state.otp) {
            // Success: Save user
            localStorage.setItem('cabs_user', state.mobileNumber);
            navigateTo('emergency');
        } else {
            alert('Invalid OTP. Please try 1234.');
        }
    });

    backToLoginBtn.addEventListener('click', () => {
        navigateTo('login');
    });
}

/* 3. Emergency Contact Logic */
const emName = document.getElementById('emergency-name');
const emNumber = document.getElementById('emergency-number');
const saveEmBtn = document.getElementById('save-emergency-btn');

if (saveEmBtn) {
    saveEmBtn.addEventListener('click', () => {
        if (emName.value && emNumber.value) {
            state.emergencyContact = {
                name: emName.value,
                number: emNumber.value
            };
            // Save Contact
            localStorage.setItem('cabs_contact', JSON.stringify(state.emergencyContact));
            navigateTo('dashboard');
        } else {
            alert('Please fill in emergency contact details.');
        }
    });
}

/* 4. Dashboard & Booking Logic */
// Maps to UI elements in index.html for 3-step booking
const stepInput = document.getElementById('booking-step-input');
const stepVehicles = document.getElementById('booking-step-vehicles');
const stepLive = document.getElementById('booking-step-live');
const findDriverBtn = document.getElementById('find-driver-btn');
const backToInputBtn = document.getElementById('back-to-input');
const vehicleList = document.getElementById('vehicle-list');
const endRideBtn = document.getElementById('end-ride-btn');
const liveSharingBadge = document.getElementById('live-sharing-badge');
const stopSharingLiveBtn = document.getElementById('stop-sharing-live');

// Location Sharing
const locationToggle = document.getElementById('location-toggle');
const locationModal = document.getElementById('location-modal');
const shareOnceBtn = document.getElementById('share-once-btn');
const shareAlwaysBtn = document.getElementById('share-always-btn');
const cancelLocBtn = document.getElementById('cancel-location-btn');
const activeSharingStatus = document.getElementById('active-sharing-status');

let currentRideData = {
    start: '',
    dest: '',
    vehicle: null,
    driver: null,
    price: 0
};

// --- Location Sharing Logic ---
if (locationToggle) {
    locationToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            e.target.checked = false;
            locationModal.classList.remove('hidden');
        } else {
            disableLocationSharing();
        }
    });
}

function enableLocationSharing(mode) {
    state.locationSharing = { enabled: true, mode: mode };
    locationToggle.checked = true;
    locationModal.classList.add('hidden');
    activeSharingStatus.classList.remove('hidden');
    updateLiveSharingBadge(true);
    console.log(`Sharing Enabled: ${mode}`);
}

function disableLocationSharing() {
    state.locationSharing = { enabled: false, mode: '' };
    if (locationToggle) locationToggle.checked = false;
    activeSharingStatus.classList.add('hidden');
    updateLiveSharingBadge(false);
    console.log('Sharing Disabled');
}

function updateLiveSharingBadge(active) {
    if (!liveSharingBadge) return;
    if (active) {
        liveSharingBadge.classList.remove('hidden');
        liveSharingBadge.style.display = 'flex'; // Ensure flex
    } else {
        liveSharingBadge.classList.add('hidden');
        liveSharingBadge.style.display = 'none';
    }
}

if (shareOnceBtn) shareOnceBtn.addEventListener('click', () => enableLocationSharing('ONCE'));
if (shareAlwaysBtn) shareAlwaysBtn.addEventListener('click', () => enableLocationSharing('ALWAYS'));

if (cancelLocBtn) {
    cancelLocBtn.addEventListener('click', () => {
        locationModal.classList.add('hidden');
        locationToggle.checked = false;
    });
}

if (stopSharingLiveBtn) {
    stopSharingLiveBtn.addEventListener('click', () => {
        disableLocationSharing();
    });
}

// --- Step 1: Input -> Vehicle Selection ---
if (findDriverBtn) {
    findDriverBtn.addEventListener('click', () => {
        const start = document.querySelector('.start-input').value;
        const dest = document.querySelector('.dest-input').value;

        if (!start || !dest) {
            alert('Please enter both pickup and destination');
            return;
        }

        currentRideData.start = start;
        currentRideData.dest = dest;

        // Populate Vehicles
        renderVehicles();

        // Transition
        stepInput.classList.add('hidden');
        stepVehicles.classList.remove('hidden');
    });
}

// --- Step 2: Vehicle Selection ---
const confirmBookingBtn = document.getElementById('confirm-booking-btn');

if (backToInputBtn) {
    backToInputBtn.addEventListener('click', () => {
        stepVehicles.classList.add('hidden');
        stepInput.classList.remove('hidden');
    });
}

function renderVehicles() {
    if (!vehicleList) return;

    // Reset selection state when re-rendering
    currentRideData.vehicleId = null;
    if (confirmBookingBtn) {
        confirmBookingBtn.disabled = true;
        confirmBookingBtn.innerText = 'Confirm Booking';
    }

    const vehicles = [
        { id: 'bike', name: 'Bike', desc: 'Beat the traffic', price: 45, time: '2 min' },
        { id: 'auto', name: 'Auto', desc: 'No bargaining', price: 85, time: '4 min' },
        { id: 'mini', name: 'Mini', desc: 'Comfy hatchbacks', price: 120, time: '6 min' },
        { id: 'prime', name: 'Prime SUV', desc: 'Spacious 6-seater', price: 190, time: '8 min' },
    ];

    vehicleList.innerHTML = vehicles.map(v => `
        <div id="v-card-${v.id}" class="vehicle-card" onclick="selectVehicle('${v.id}', '${v.name}', ${v.price})">
            <div class="v-info">
                <h4>${v.name}</h4>
                <p>ETA: ${v.time} • ${v.desc}</p>
            </div>
            <div class="v-price">₹${v.price}</div>
        </div>
    `).join('');
}

window.selectVehicle = function (id, name, price) {
    // 1. Remove selected class from all
    document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));

    // 2. Add to clicked
    const card = document.getElementById(`v-card-${id}`);
    if (card) card.classList.add('selected');

    // 3. Update State
    currentRideData.vehicleId = id;
    currentRideData.vehicle = name;
    currentRideData.price = price;

    // 4. Enable Confirm Button
    if (confirmBookingBtn) {
        confirmBookingBtn.disabled = false;
        confirmBookingBtn.innerText = `Confirm ${name}`;
    }
};

// Listen for Confirm Click
if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', () => {
        if (currentRideData.vehicleId) {
            startLiveRide();
        }
    });
}

// --- Step 3: Live Ride ---
function startLiveRide() {
    // Generate Mock Driver
    const carModels = ['Swift Dzire', 'Toyota Etios', 'Hyundai Xcent', 'Honda Amaze'];
    const model = carModels[Math.floor(Math.random() * carModels.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);

    currentRideData.driver = {
        name: 'Ramesh Kumar',
        car: `${model} • KA 01 AB ${randomNum}`,
        rating: 4.8
    };

    // Update UI
    const driverNameEl = document.getElementById('driver-name');
    const vehicleDetailsEl = document.getElementById('vehicle-details');

    if (driverNameEl) driverNameEl.innerText = currentRideData.driver.name;
    if (vehicleDetailsEl) vehicleDetailsEl.innerText = currentRideData.driver.car;

    // Check Sharing Status
    updateLiveSharingBadge(state.locationSharing.enabled);

    // Transition
    stepVehicles.classList.add('hidden');
    stepLive.classList.remove('hidden');
}

// --- Step 4: End Ride ---
if (endRideBtn) {
    endRideBtn.addEventListener('click', () => {
        const ride = {
            id: Date.now(),
            start: currentRideData.start,
            dest: currentRideData.dest,
            driver: currentRideData.driver.name,
            vehicle: currentRideData.vehicle,
            price: currentRideData.price,
            date: new Date().toLocaleString(),
            status: 'Completed'
        };

        const rides = JSON.parse(localStorage.getItem('cabs_rides') || '[]');
        rides.unshift(ride);
        localStorage.setItem('cabs_rides', JSON.stringify(rides));

        let msg = `Ride Completed! Paid ₹${currentRideData.price}.`;
        alert(msg);

        // Reset UI
        document.querySelector('.start-input').value = '';
        document.querySelector('.dest-input').value = '';
        stepLive.classList.add('hidden');
        stepInput.classList.remove('hidden');
    });
}

/* My Rides Logic */
const myRidesBtn = document.getElementById('my-rides-btn');
const backToDashBtn = document.getElementById('back-to-dash');

if (myRidesBtn) {
    myRidesBtn.addEventListener('click', () => {
        navigateTo('rides');
    });
}

if (backToDashBtn) {
    backToDashBtn.addEventListener('click', () => {
        navigateTo('dashboard');
    });
}

function renderRides() {
    const list = document.getElementById('rides-list');
    const rides = JSON.parse(localStorage.getItem('cabs_rides') || '[]');

    if (rides.length === 0) {
        list.innerHTML = '<p class="empty-state">No rides yet.</p>';
        return;
    }

    list.innerHTML = rides.map(ride => `
        <div class="ride-card">
            <span class="ride-status-done">${ride.status}</span>
            <h4>${ride.dest}</h4>
            <p>From: ${ride.start}</p>
            <p>Vehicle: ${ride.vehicle} (₹${ride.price})</p>
            <p>Driver: ${ride.driver}</p>
            <p style="font-size:10px; color:#6b7280; margin-top:4px;">${ride.date}</p>
        </div>
    `).join('');
}

// Logout Feature (For Testing)
const avatar = document.querySelector('.avatar');
if (avatar) {
    avatar.addEventListener('click', () => {
        if (confirm('Logout and clear session?')) {
            localStorage.clear();
            location.reload();
        }
    });
}
