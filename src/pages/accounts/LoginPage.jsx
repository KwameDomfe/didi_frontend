import { useState, useEffect, useCallback } from 'react';
import { FaUserPlus, FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaHome, FaUtensils, FaSignOutAlt, FaSpinner, FaUsers, FaTruck, FaShoppingBag } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';

const DEFAULT_USER_TYPES = [
    { value: 'customer', label: 'Customer', description: 'Order food and enjoy meals' },
    { value: 'vendor', label: 'Vendor', description: 'Manage restaurants and menus' },
    { value: 'delivery', label: 'Delivery', description: 'Deliver orders and earn money' },
    { value: 'staff', label: 'Staff', description: 'Work in restaurants' }
];

// Login page component
const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        userType: 'customer'
    });
    const [userTypes, setUserTypes] = useState(DEFAULT_USER_TYPES);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    
    const { setUser, user, API_BASE_URL, showToast } = useApp();
    const navigate = useNavigate();

    const handleCancel = () => {
        if (window.history.length > 1) {
        navigate(-1);
        return;
        }

        navigate('/');
    };
  
    // Handle keyboard events for password reveal buttons
    const handlePasswordRevealKeyDown = (e, toggleFunction) => {
        if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFunction();
        }
    };

    const fetchUserTypes = useCallback(async () => {
        try {
        const response = await axios.get(`${API_BASE_URL}/accounts/auth/user-types/`);
        setUserTypes(response.data.user_types);
        } catch (error) {
        showToast('Failed to load user types', 'error');
        setUserTypes(DEFAULT_USER_TYPES); // fallback
        }
    }, [API_BASE_URL, showToast]);

    // Load user types on component mount
    useEffect(() => {
        fetchUserTypes();
    }, [fetchUserTypes]);

    const formatPhoneNumber = (value) => {
        // Remove all non-digit characters except +
        const cleaned = value.replace(/[^\d+]/g, '');
        
        // Separate country code and digits
        let countryCode = '';
        let digits = cleaned;
        
        if (cleaned.startsWith('+')) {
        digits = cleaned.slice(1);
        countryCode = '+';
        }
        
        // Limit total digits to 15
        digits = digits.slice(0, 15);
        
        // Format with dashes: +XXX-XX-XXX-XXXX
        if (!digits) return countryCode;
        
        let formatted = countryCode;
        
        // Country code (first 1-3 digits)
        if (digits.length <= 3) {
        formatted += digits;
        } else if (digits.length <= 5) {
        formatted += digits.slice(0, 3) + '-' + digits.slice(3);
        } else if (digits.length <= 8) {
        formatted += digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5);
        } else {
        formatted += digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5, 8) + '-' + digits.slice(8);
        }
        
        return formatted;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        let processedValue = value;
        
        // Format phone number as user types
        if (name === 'phoneNumber') {
        processedValue = formatPhoneNumber(value);
        }
        
        setFormData(prev => ({
        ...prev,
        [name]: processedValue
        }));
        
        // Clear specific error when user starts typing
        if (errors[name]) {
        setErrors(prev => ({
            ...prev,
            [name]: ''
        }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (isLogin) {
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        } else {
        if (!formData.username) newErrors.username = 'Username is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (!formData.passwordConfirm) newErrors.passwordConfirm = 'Please confirm your password';
        if (formData.password !== formData.passwordConfirm) {
            newErrors.passwordConfirm = 'Passwords do not match';
        }
        if (!formData.userType) newErrors.userType = 'Please select a user type';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const checkEmailAvailability = async (email) => {
        try {
        const response = await axios.post(`${API_BASE_URL}/accounts/auth/check-email/`, {
            email
        });
        return response.data.available;
        } catch (error) {
        return true; // Assume available if check fails
        }
    };

    const checkUsernameAvailability = async (username) => {
        try {
        const response = await axios.post(`${API_BASE_URL}/accounts/auth/check-username/`, {
            username
        });
        return response.data.available;
        } catch (error) {
        return true; // Assume available if check fails
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        // Clear any prior success message when attempting login
        setSuccessMessage('');
        setLoading(true);
        try {
        const response = await axios.post(`${API_BASE_URL}/accounts/login/`, {
            email: formData.email,
            password: formData.password
        });
        
        // Store token
        localStorage.setItem('authToken', response.data.token);
        
        // Set user in context
        setUser(response.data.user);
        
        showToast(response.data.message || 'Login successful!', 'success');
        navigate('/');
        } catch (error) {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.detail || 
                            'Login failed. Please check your credentials.';
        showToast(errorMessage, 'error');
        } finally {
        setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        // Check email and username availability
        const emailAvailable = await checkEmailAvailability(formData.email);
        const usernameAvailable = await checkUsernameAvailability(formData.username);

        if (!emailAvailable) {
        setErrors(prev => ({ ...prev, email: 'Email is already registered' }));
        return;
        }
        if (!usernameAvailable) {
        setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
        return;
        }

        setLoading(true);
        try {
        const registrationData = {
            username: formData.username,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            user_type: formData.userType,
            password: formData.password,
            password_confirm: formData.passwordConfirm
        };
        
        // Only include phone number if provided
        if (formData.phoneNumber && formData.phoneNumber.trim()) {
            // Remove dashes for backend (keep only + and digits)
            registrationData.phone_number = formData.phoneNumber.replace(/-/g, '');
        }
        
        const response = await axios.post(`${API_BASE_URL}/accounts/auth/register/`, registrationData);
        
        // Store token
        localStorage.setItem('authToken', response.data.token);
        
        // Set user in context
        setUser(response.data.user);
        
        showToast(response.data.message || 'Registration successful!', 'success');
        
        // Show verification message if email verification was sent
        if (response.data.verification_email_sent) {
            showToast('Please check your email for verification code', 'info');
            // Redirect to verification page
            setTimeout(() => {
            navigate('/verify-email?email=' + encodeURIComponent(response.data.user.email));
            }, 1500);
        } else {
            navigate('/');
        }
        } catch (error) {
        const errorData = error.response?.data;
        if (errorData) {
            // Handle field-specific errors
            const newErrors = {};
            Object.keys(errorData).forEach(field => {
            if (Array.isArray(errorData[field])) {
                newErrors[field] = errorData[field][0];
            } else if (typeof errorData[field] === 'string') {
                newErrors[field] = errorData[field];
            }
            });
            setErrors(newErrors);
            showToast('Please fix the errors in the form', 'error');
        } else {
            showToast('Registration failed. Please try again.', 'error');
        }
        } finally {
        setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setFormData({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        userType: 'customer'
        });
        setErrors({});
        setSuccessMessage('');
        setShowPassword(false);
        setShowPasswordConfirm(false);
    };

    return (
        <div className="container container90"
        > 
            <div className=""
            >
                {   user 
                ?   (
                        <div className=" shadow-5 bg-brown0 gold0 br0-25"
                        >
                            <div className="pa1-00 pa2-00-m mv4-00">
                                <h2 className="">
                                    <FaCheckCircle className="mr0-50 gold0" /> 
                                    Already Logged In
                                </h2>
                                <p className="mb2-00 ">
                                    You're currently logged in as 
                                    <strong className="ml0-50">
                                        {user.username || user.email}
                                    </strong>
                                </p>
                                <div className="grid ggap2-00 mb2-00"
                                >
                                    <Link to="/" 
                                        className="gc1s1 ba b--gold0 bg-gold0 brown0 gold0 pointer pa0-50 flex items-center"
                                    >
                                        <FaHome className="mr0-50" /> Go to Home
                                    </Link>
                                    <Link to="/restaurants" 
                                        className="gc2s1 ba b--gold0 bg-gold0 brown0 gold0 pointer pa0-50 flex items-center"
                                    >
                                        <FaUtensils className="mr0-50" /> Browse Restaurants
                                    </Link>
                                </div>
                                <div
                                >
                                    <button 
                                        className="ba b--gold0 bg-gold0 brown0 gold0 pointer pa0-50 flex items-center"
                                        onClick={() => {
                                        localStorage.removeItem('authToken');
                                        setUser(null);
                                        showToast('Logged out successfully', 'success');
                                        }}
                                    >
                                        <FaSignOutAlt className="mr0-50" /> Logout and Login as Different User
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) 
                :   (
                        <div className="shadow-5 bg-gold0 mv2-00 pa2-00">
                            <div className="flex flex-column items-center w-50-m bg-brown0 br0-25 pa2-00">
                                <div className="white tc pv2-00">
                                    <h2 className="gold0">
                                        {isLogin 
                                            ? <><FaLock className="mr0-50" /> Login</>
                                            : <><FaUserPlus className="mr0-50" /> Create Account</>
                                        }
                                    </h2>
                                    <p className="">
                                        {isLogin 
                                            ? 'Welcome back! Please sign in to your account.' 
                                            : 'Join our platform and start your journey!'
                                        }
                                    </p>
                                </div>
                                {/* Social Login Buttons */}
                                {/* <div className="w-100 mb2-00">
                                    <div className="flex flex-column gap-2">
                                        <button type="button" className="ba br0-25 pa0-50 flex items-center justify-center bg-white gold0 w-100 mb1-00 pointer" style={{borderColor:'#db4437'}} onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/accounts/google/login/`}>
                                            <FaGoogle className="mr0-50" style={{color:'#db4437'}} /> Continue with Google
                                        </button>
                                        <button type="button" className="ba br0-25 pa0-50 flex items-center justify-center bg-white gold0 w-100 mb1-00 pointer" style={{borderColor:'#1877f3'}} onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/accounts/facebook/login/`}>
                                            <FaFacebook className="mr0-50" style={{color:'#1877f3'}} /> Continue with Facebook
                                        </button>
                                        <button type="button" className="ba br0-25 pa0-50 flex items-center justify-center bg-white gold0 w-100 mb1-00 pointer" style={{borderColor:'#0077b5'}} onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/accounts/linkedin_oauth2/login/`}>
                                            <FaLinkedin className="mr0-50" style={{color:'#0077b5'}} /> Continue with LinkedIn
                                        </button>
                                        <button type="button" className="ba br0-25 pa0-50 flex items-center justify-center bg-white gold0 w-100 pointer" style={{borderColor:'#000'}} onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/accounts/twitter/login/`}>
                                            <FaTwitter className="mr0-50" style={{color:'#000'}} /> Continue with X
                                        </button>
                                    </div>
                                    <div className="tc mv2-00 gold0">or</div>
                                </div> */}

                                {/* User Type Info */}
                                {
                                    !isLogin && (
                                        <div className="shadow-5 bg-black-10 gold0 pa1-00 br0-25"
                                        >
                                            <div className="">
                                                <h4 className="mb1-00 
                                                    flex items-center justify-center"
                                                >
                                                    <FaUsers className="mr0-50" /> Choose Your Role
                                                </h4>
                                                <div className=""
                                                >
                                                    
                                                    <div className="flex flex-column"
                                                    >
                                                        <div className="mb0-50">
                                                            <FaUtensils className="mr0-50" />
                                                            <strong>Vendor:</strong> Manage restaurants and menus
                                                        </div>
                                                        <div className="mb0-50 ">
                                                            <FaTruck className="mr0-50" />
                                                            <strong>Delivery:</strong> Deliver orders and earn money
                                                        </div>
                                                        <div className="mb0-50">
                                                            <FaUsers className="mr0-50" />
                                                            <strong>Staff:</strong> Work in restaurants
                                                        </div>
                                                        <div className="mb0-50">
                                                            <FaShoppingBag className="mr0-50" />
                                                            <strong>Customer:</strong> Order food and enjoy meals
                                                        </div>
                                                    </div>
                                            
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }

                                {successMessage && (
                                    <div className="alert alert-success" role="alert">
                                    {successMessage}
                                    </div>
                                )}

                                <form onSubmit={isLogin ? handleLogin : handleRegister}
                                    className=" pa1-00"
                                >
                                    {
                                        !isLogin && (
                                            <div>
                                                {/* User Type Selection */}
                                                <div className="mb2-00 pa1-00"
                                                >
                                                    <div className="mb1-00">
                                                        <label className="gold0 mr0-50"
                                                    >
                                                        I want to join as: 
                                                    </label>
                                                    <select
                                                        name="userType"
                                                        className={`pa0-50 white
                                                            form-select 
                                                            ${errors.userType 
                                                                ? 'is-invalid' 
                                                                : ''
                                                            }
                                                            `
                                                        }
                                                        value={formData.userType}
                                                        onChange={handleInputChange}
                                                    >
                                                        {
                                                            userTypes.map(
                                                                    type => (
                                                                <option key={type.value} 
                                                                    value={type.value}
                                                                >
                                                                    {type.label}
                                                                </option>
                                                                )
                                                            )
                                                        }
                                                    </select>
                                                    </div>
                                                    {
                                                        errors.userType 
                                                        && <div className="invalid-feedback white-90">
                                                                {errors.userType}
                                                            </div>
                                                    }
                                                    {
                                                        formData.userType && (
                                                            <div className="white-90">
                                                                {userTypes.find(t => t.value === formData.userType)?.description}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                                {/* Name Fields */}
                                                {/* <div className="mb2-00 pa1-00"> */}
                                                    {/* <div className="">
                                                        <div className="white mb1-00">
                                                        <label className="gold0 mr1-00">
                                                            First Name:
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="firstName"
                                                            className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                                                            value={formData.firstName}
                                                            onChange={handleInputChange}
                                                        />
                                                        {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                                                        </div>
                                                    </div> */}
                                                    {/* <div className="">
                                                        <div className="mb1-00">
                                                            <label className="gold0 mr1-00">
                                                                Last Name:
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="lastName"
                                                                className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                                                                value={formData.lastName}
                                                                onChange={handleInputChange}
                                                            />
                                                            {errors.lastName && 
                                                            <div className="invalid-feedback">
                                                                {errors.lastName}
                                                            </div>}
                                                        </div>
                                                    </div> */}
                                                    {/* Username */}
                                                    {/* <div className="mb1-00">
                                                    <label className="gold0 mr1-00">Username: </label>
                                                    <input
                                                        type="text"
                                                        name="username"
                                                        className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                                                        value={formData.username}
                                                        onChange={handleInputChange}
                                                        placeholder="Choose a unique username"
                                                    />
                                                    {errors.username && <div className="">{errors.username}</div>}
                                                    </div> */}
                                                {/* </div> */}
                                            </div>
                                        )
                                    }

                                    {/* Email */}
                                    <div className="mb2-00"
                                    >
                                        <label className="dib pb1-00 gold0">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className={
                                                `pa0-50 w-100 ${errors.email 
                                                ? 'is-invalid' 
                                                : ''}`
                                            }
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="your@email.com"
                                        />
                                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                    </div>

                                    {/* Phone Number */}
                                    {
                                        !isLogin && (
                                            <div className="mb2-00 white-90"
                                            >
                                                <label className="gold0 mb0-50 dib"
                                                >
                                                    Phone Number 
                                                    <span className="mh0-50 white-90"
                                                    >
                                                        (Optional)
                                                    </span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phoneNumber"
                                                    className={`pa0-50 form-control 
                                                        ${errors.phoneNumber 
                                                            || errors.phone_number 
                                                            ? 'is-invalid' : ''
                                                        }`
                                                    }
                                                    value={formData.phoneNumber}
                                                    onChange={handleInputChange}
                                                    placeholder="+233-24-345-3454"
                                                    maxLength="20"
                                                />
                                                <div>
                                                    <small className="">
                                                        Format: <br></br>
                                                        +[country code]-[area]-[number]-[number] <br/> 
                                                        (e.g., +233-24-345-3454)
                                                    </small>
                                                </div>
                                                {   
                                                    (errors.phoneNumber || errors.phone_number) 
                                                    && (
                                                        <div className="invalid-feedback">
                                                            {errors.phoneNumber || errors.phone_number}
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        )
                                    }

                                    {/* Password */}
                                    <div className="mb2-00">
                                        <label className="dib pb1-00 gold0">
                                            Password
                                        </label>
                                        <div className="mb0-50">
                                            <input
                                                type={showPassword 
                                                    ? "text" 
                                                    : "password"
                                                }
                                                name="password"
                                                className={`pa0-50 ${errors.password ? 'is-invalid' : ''}`}
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder={isLogin ? "Enter your password" : "Minimum 8 characters"}
                                            />
                                            <button
                                                type="button"
                                                className="ml0-50 pa0-50 b--transparent pointer"
                                                onClick={
                                                    () => setShowPassword(!showPassword)
                                                }
                                                onKeyDown={
                                                    (e) => handlePasswordRevealKeyDown(e, () => setShowPassword(!showPassword))
                                                }
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                title={showPassword ? "Hide password" : "Show password"}
                                                tabIndex="0"
                                            >
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                        {
                                            errors.password 
                                            &&  <div className="">
                                                    {errors.password}
                                                </div>
                                        }
                                        {
                                            !isLogin && (
                                                <div className="">
                                                    <label className="dib gold0 mb0-50">Confirm Password</label>
                                                    <div className="input-group">
                                                        <input
                                                            type={showPasswordConfirm ? "text" : "password"}
                                                            name="passwordConfirm"
                                                            className={`pa0-50 form-control ${errors.passwordConfirm ? 'is-invalid' : ''}`}
                                                            value={formData.passwordConfirm}
                                                            onChange={handleInputChange}
                                                            placeholder="Confirm your password"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="ml0-50 pa0-50 b--transparent pointer"
                                                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                                            onKeyDown={(e) => handlePasswordRevealKeyDown(e, () => setShowPasswordConfirm(!showPasswordConfirm))}
                                                            aria-label={showPasswordConfirm 
                                                                ? "Hide password confirmation" 
                                                                : "Show password confirmation"
                                                            }
                                                            title={showPasswordConfirm 
                                                                ? "Hide password confirmation" 
                                                                : "Show password confirmation"
                                                            }
                                                            tabIndex="0"
                                                        >
                                                            {showPasswordConfirm ? <FaEyeSlash /> : <FaEye />}
                                                        </button>
                                                    </div>
                                                    {errors.passwordConfirm 
                                                        && <div className="invalid-feedback d-block">
                                                                {errors.passwordConfirm}
                                                            </div>}
                                                </div>
                                            )
                                        }
                                    </div>

                                    {/* Submit Button */}
                                    <div className="mb2-00">
                                        <button 
                                            type="submit" 
                                            className={
                                                `
                                                ${isLogin 
                                                    ? 'btn-primary' 
                                                    : 'btn-success'
                                                } 
                                                
                                                pa0-50 bg-gold0 ba bn br0-25 brown0`}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                            <>
                                                <FaSpinner className="fa-spin mr0-50" />
                                                {isLogin ? 'Signing In...' : 'Creating Account...'}
                                            </>
                                            ) : (
                                            isLogin 
                                                ? <><FaLock className="mr0-50" /> Sign In</>
                                                : <><FaUserPlus className="mr0-50" /> Create Account</>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                        className="pa0-50 ml1-00 ba br0-25 gold0 bg-transparent b--gold0 pointer"
                                        onClick={handleCancel}
                                        > 
                                            Cancel
                                        </button>
                                    </div>

                                    {/* Switch Mode */}
                                    <div className="gold0 mb2-00">
                                        <p className="mb1-00">
                                            {
                                                isLogin 
                                                ? "Don't have an account? "
                                                : "Already have an account? "
                                            }
                                            
                                        </p><button 
                                            type="button"
                                            className="pa0-50 ba b--gold0 bg-transparent gold0 pointer br0-25"
                                            onClick={switchMode}
                                            >
                                            {isLogin ? 'Create one here' : 'Sign in instead'}
                                            </button>
                                    </div>

                                    {isLogin && (
                                    <div className="text-center mt-3">
                                        <Link to="/forgot-password" className="pa0-50 ba br0-25 bg-gold0 brown0">
                                        Forgot your password?
                                        </Link>
                                    </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
    };

export default LoginPage;