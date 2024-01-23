$(".card-img-top").hover(function(){
    $(this).fadeTo(200,"0.67")
},function(){
    $(this).fadeTo(200,"1")
})

function validateForm() {
    var uname = document.getElementById("uname").value;
    var email = document.getElementById("email").value;
    var phone = document.getElementById("phone").value;
    var address = document.getElementById("address").value;

    var isValid = true;

    // Validate username
    if (!isValidUsername(uname)) {
        document.getElementById("unameError").innerHTML = "Invalid username. Alphabets and spaces only.";
        isValid = false;
    } else {
        document.getElementById("unameError").innerHTML = "";
    }

    // Validate email
    if (!isValidEmail(email)) {
        document.getElementById("emailError").innerHTML = "Invalid email format.";
        isValid = false;
    } else {
        document.getElementById("emailError").innerHTML = "";
    }

    // Validate phone
    if (!isValidPhone(phone)) {
        document.getElementById("phoneError").innerHTML = "Invalid phone number. Must be 10 digits.";
        isValid = false;
    } else {
        document.getElementById("phoneError").innerHTML = "";
    }

    // Validate address
    if (!isValidAddress(address)) {
        document.getElementById("addressError").innerHTML = "Invalid address. No special characters allowed.";
        isValid = false;
    } else {
        document.getElementById("addressError").innerHTML = "";
    }

    return isValid;
}

function isValidUsername(username) {
    return /^[A-Za-z\s]+$/.test(username);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\d{10}$/.test(phone);
}

function isValidAddress(address) {
    return /^[A-Za-z0-9\s,.-]+$/.test(address);
}
$("#logout").on("click",function(){
    $.ajax({
        type: 'POST',
        url: "http://localhost:3000/logout",
        data: {},
        success: function (response) {        
            console.log('Logout successful');
            window.location.reload()
        },
        error: function (error) {
            console.error('Logout error:', error);
        }
    });
})
$(".addtocart").on("click",function(){
    let payload = $(this).val()
    $.ajax({
        type: 'POST',
        url: "http://localhost:3000/addToCart",
        data:{name:payload},
        success:(response)=>{
            window.alert(response.status)
            window.reload()
        },
        error:(err)=>{
            window.alert("Cannot be added to cart")
        }
    })
    $(this).css("display","none")
})
function removeSelected() {
    const checkboxes = $('tbody input[type="checkbox"]:checked');
    const selectedIds = checkboxes.map(function() {
        return this.value;
    }).get();

    // Send a POST request to your server with the selected item IDs using jQuery AJAX
    $.ajax({
        url: '/removeCart',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ selectedIds }),
        success: function(data) {
            console.log('Success:', data);
            window.alert(data.message);
            location.reload();
        },
        error: function(error) {
            console.error('Error:', error);
            window.alert(error.responseJSON.error);
        }
    });
}

function checkout() {
    
    // Send a POST request to your server with the selected item IDs using jQuery AJAX
    $.ajax({
        url: '/checkout',
        type: 'POST',
        success: function(data) {
            console.log('Success:', data);
            window.alert(data.message);
            if(data.flag!==0){
                window.location.href = '/home';
            }
        },
        error: function(error) {
            console.error('Error:', error);
            window.alert(error.responseJSON.error);
        }
    });
}