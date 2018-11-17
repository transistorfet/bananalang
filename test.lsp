(define fac
    (lambda (x)
        (if (= x 1)
            1
            (* x (fac (- x 1))))))

(fac 4)

(define fac2
    (lambda (x r)
        (if (= x 0)
            r
            (fac2 (- x 1) (* r x)))))

(fac2 4 1)
