import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Country } from 'src/app/common/country';
import { Order } from 'src/app/common/order';
import { OrderItem } from 'src/app/common/order-item';
import { PaymentInfo } from 'src/app/common/payment-info';
import { Purchase } from 'src/app/common/purchase';
import { State } from 'src/app/common/state';
import { CartService } from 'src/app/services/cart.service';
import { CheckoutService } from 'src/app/services/checkout.service';
import { Luv2ShopFormService } from 'src/app/services/luv2-shop-form.service';
import { Luv2ShopValidators } from 'src/app/validators/luv2-shop-validators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {


  checkoutFormGroup!: FormGroup;

  totalPrice: number = 0;
  totalQuantity: number = 0;

  creditCardYears : number[] = [];
  creditCardMonths : number[] = [];

  countries: Country[] = [];

  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];

  storage: Storage = sessionStorage;

  //Initilize Stripe api
  stripe = Stripe(environment.stripePublishableKey);

  paymentInfo : PaymentInfo = new PaymentInfo();
  cardElement : any;
  displayError: any = "";


  constructor(private formBuilder: FormBuilder,
              private luv2ShopFormService : Luv2ShopFormService,
              private cartService : CartService,
              private checkoutService: CheckoutService,
              private router: Router) { }

  ngOnInit(): void {

    //setup stripe payment form
    this.setupStripePaymentForm();

    this.reviewCartDetails();

    //read the user;s email from browser storage
    const theEmail = JSON.parse(this.storage.getItem('userEmail')!);

    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: new FormControl('',
                                [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace]),
        lastName:  new FormControl('',
                                [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace]),
        email: new FormControl(theEmail,
                              [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'), Luv2ShopValidators.notOnlyWhitespace])
      }),

      shippingAddress: this.formBuilder.group({
        street:  new FormControl('',
                              [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace]),
        city: new FormControl('',
                              [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace]),
        state:  new FormControl('',[Validators.required]),
        country:new FormControl('',[Validators.required]),
        zipCode:  new FormControl('',
                                [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace])
      }),

      billingAddress: this.formBuilder.group({
        street:  new FormControl('',
                              [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace]),
        city: new FormControl('',
                              [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace]),
        state:  new FormControl('',[Validators.required]),
        country:new FormControl('',[Validators.required]),
        zipCode:  new FormControl('',
                                [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace])
      }),

      creditCard: this.formBuilder.group({
      //   cardType: new FormControl('',[Validators.required]),
      //   nameOnCard: new FormControl('',
      //                            [Validators.required, Validators.minLength(2),Luv2ShopValidators.notOnlyWhitespace]),
      //  cardNumber: new FormControl('',[Validators.required,Validators.pattern('[0-9]{16}')]),
      //  securityCode:new FormControl('',[Validators.required,Validators.pattern('[0-9]{3}')]),
      //  expirationMonth: [''],
      //  expirationYear: ['']
      })
    });

    // //Populate credit card months
    // const startMonth:number =  new Date().getMonth() + 1;
    // console.log("startMonth : "+ startMonth);

    // this.luv2ShopFormService.getCreditCardMonths(startMonth).subscribe(
    //   data => {
    //     console.log("Retrieved credit card months: "+JSON.stringify(data));
    //     this.creditCardMonths = data;
    //   }
    // );

    // //populate credit card years
    //   this.luv2ShopFormService.getCreditCardYears().subscribe(
    //     data => {
    //       console.log("Retrieved credit card years: " + JSON.stringify(data));
    //       this.creditCardYears = data;
    //     }
    //   );


     //populate countries
     this.luv2ShopFormService.getCountries().subscribe(
      data =>{
        console.log("reterived countries: "+ JSON.stringify(data));
        this.countries = data;
      }
     );
  }

  setupStripePaymentForm() {

    //get a handle to stripe elements
    var elements = this.stripe.elements();

    //Create a card elememt
    this.cardElement = elements.create('card',{hidePostalCode: true});

    //Add an instance of card UI component into the 'card-elememt' div
    this.cardElement.mount('#card-elment');

    //Add event binding for the 'change' event on the card element
    this.cardElement.on('change',(event:any) => {
      //get handle to card error element
      this.displayError = document.getElementById('card-errors');

      if(event.complete){
        this.displayError.textContent = "";
      }else if(event.error){
        //show validation error
        this.displayError.textContent = event.error.message;
      }
    });


  }
  reviewCartDetails() {

    //subscribe to cartServuce.totalQuantity
    this.cartService.totalQuantity.subscribe(
      totalQuantity => this.totalQuantity = totalQuantity
    );

    //subscribe to cartService.totalPrice
    this.cartService.totalPrice.subscribe(
      totalPrice => this.totalPrice = totalPrice
    );
  }

  onSubmit() {
    console.log("Handling the submit button");

    if (this.checkoutFormGroup.invalid) {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }

    // set up order
    let order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;

    // get cart items
    const cartItems = this.cartService.cartItems;

    // create orderItems from cartItems
    // - long way
    /*
    let orderItems: OrderItem[] = [];
    for (let i=0; i < cartItems.length; i++) {
      orderItems[i] = new OrderItem(cartItems[i]);
    }
    */

    // - short way of doing the same thingy
    let orderItems: OrderItem[] = cartItems.map(tempCartItem => new OrderItem(tempCartItem));

    // set up purchase
    let purchase = new Purchase();
    
    // populate purchase - customer
    purchase.customer = this.checkoutFormGroup.controls['customer'].value;
    
    // populate purchase - shipping address
    purchase.shippingAddress = this.checkoutFormGroup.controls['shippingAddress'].value;
    const shippingState: State = JSON.parse(JSON.stringify(purchase.shippingAddress.state));
    const shippingCountry: Country = JSON.parse(JSON.stringify(purchase.shippingAddress.country));
    purchase.shippingAddress.state = shippingState.name;
    purchase.shippingAddress.country = shippingCountry.name;

    // populate purchase - billing address
    purchase.billingAddress = this.checkoutFormGroup.controls['billingAddress'].value;
    const billingState: State = JSON.parse(JSON.stringify(purchase.billingAddress.state));
    const billingCountry: Country = JSON.parse(JSON.stringify(purchase.billingAddress.country));
    purchase.billingAddress.state = billingState.name;
    purchase.billingAddress.country = billingCountry.name;
  
    // populate purchase - order and orderItems
    purchase.order = order;
    purchase.orderItems = orderItems;

    //compute payment info
    this.paymentInfo.amount = this.totalPrice * 100;
    this.paymentInfo.currency = "USD";

    //if valid form then
    //- create payment intent
    //-confirm card payment
    //-place order

    if(!this.checkoutFormGroup.invalid && this.displayError.textContent ===""){
      this.checkoutService.createPaymentIntent(this.paymentInfo).subscribe(
        (paymentIntentResponse) =>{
          this.stripe.confirmCardPayment(paymentIntentResponse.client_secret,
            {
              payment_method:{
                card:this.cardElement
              }
            },{handleActions: false})
            .then((result:any) =>{
              if(result.error){
                //inform the customer there was an error
                alert(`there was an error : ${result.error.message}`);
              }else{
                //call rest api via the checkoutService
                this.checkoutService.placeOrder(purchase).subscribe({
                  next:(response: any) => {
                    alert(`Your order has been received. \nOrder tracking number: ${response.orderTrackingNumber}`);

                    //reset cart
                    this.resetCart();
                  },
                  error: (err:any) =>{
                    alert(`There was an error: ${err.message}`);
                  }
                })
              }
            })
        }
      );
    }else{
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }

  }

  resetCart() {
    // reset cart data
    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);
    
    // reset the form
    this.checkoutFormGroup.reset();

    // navigate back to the products page
    this.router.navigateByUrl("/products");
  }


  get firstName(){
    return this.checkoutFormGroup.get('customer.firstName');
  }

  get lastName(){
    return this.checkoutFormGroup.get('customer.lastName');
  }

  get email(){
    return this.checkoutFormGroup.get('customer.email');
  }

  get shippingAddressStreet(){
    return this.checkoutFormGroup.get('shippingAddress.street');
  }

  get shippingAddressCity(){
    return this.checkoutFormGroup.get('shippingAddress.city');
  }
  
  get shippingAddressState(){
    return this.checkoutFormGroup.get('shippingAddress.state');
  }
  
  get shippingAddressCountry(){
    return this.checkoutFormGroup.get('shippingAddress.country');
  }
  
  get shippingAddressZipCOde(){
    return this.checkoutFormGroup.get('shippingAddress.zipCode');
  }

  get billingAddressStreet(){
    return this.checkoutFormGroup.get('shippingAddress.street');
  }

  get billingAddressCity(){
    return this.checkoutFormGroup.get('shippingAddress.city');
  }
  
  get billingAddressState(){
    return this.checkoutFormGroup.get('shippingAddress.state');
  }
  
  get billingAddressCountry(){
    return this.checkoutFormGroup.get('shippingAddress.country');
  }
  
  get billingAddressZipCOde(){
    return this.checkoutFormGroup.get('shippingAddress.zipCode');
  }

  get creditCardNameOnCard(){
    return this.checkoutFormGroup.get('creditCard.nameOnCard');
  }

  get creditCardNumber(){
    return this.checkoutFormGroup.get('creditCard.cardNumber');
  }

  get creditCardType(){
    return this.checkoutFormGroup.get('creditCard.cardType');
  }

  get creditCardSecurityCode(){
    return this.checkoutFormGroup.get('creditCard.securityCode');
  }


  copyShippingAddressToBillingAddress(event: any){
    if(event.target.checked){
      this.checkoutFormGroup.controls['billingAddress']
        .setValue(this.checkoutFormGroup.controls['shippingAddress'].value)

        //Bug fix for states
        this.billingAddressStates = this.shippingAddressStates;
    }else{
      this.checkoutFormGroup.controls['billingAddress'].reset();

      //bug fix for states
      this.billingAddressStates = [];
    }
  }

  handleMonthsAndYears(){
    const creditCardFormgroup = this.checkoutFormGroup.get('creditCard');

    const currentYear: number = new Date().getFullYear();
    const selectedYear: number = Number(creditCardFormgroup?.value.expirationYear);

    //if the current year equals to the selected year then start with the current month

    let startMonth: number;

    if(currentYear === selectedYear){
      startMonth = new Date().getMonth() + 1;
    }else{
      startMonth = 1;
    }

    this.luv2ShopFormService.getCreditCardMonths(startMonth).subscribe(
      data =>{
        console.log("Retrieved months from API: "+JSON.stringify(data));
        this.creditCardMonths = data;
      }
    );

  }

  getStates(formGroupName: string){
    const formGroup = this.checkoutFormGroup.get(formGroupName);

    const countryCode = formGroup?.value.country.code;
    const countryName = formGroup?.value.country.name;

    console.log( `${formGroupName} country code: ${countryCode}`);
    console.log( `${formGroupName} country Name: ${countryName}`);

    this.luv2ShopFormService.getStates(countryCode).subscribe(
      data =>{
        if(formGroupName == 'shippingAddress'){
          this.shippingAddressStates = data;
        }else{
          this.billingAddressStates = data
        }

        formGroup?.get('state')?.setValue(data[0]);

      }
    );

  }

}
